import mongoose, { Types } from "mongoose";
import ChannelParticipantModel from "../models/ChannelParticipant";
import ChannelInviteModel, { ChannelInvite } from "../models/ChannelInvite";
import ChannelMessageModel, { ChannelMessage } from "../models/ChannelMessage";
import ChannelModel, { Channel } from "../models/Channel";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";
import { getIO, uidRoom } from "../config/socketServer";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import ChannelTypeEnum from "../data/ChannelTypeEnum";
import User, { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { sendNotifications } from "./notificationHelper";
import { formatUserMinimal } from "./userHelper";
import { DocumentType } from "@typegoose/typegoose";
import { getAttachmentsByPostId, updatePostAttachments } from "./postsHelper";
import HttpError from "../exceptions/HttpError";

export const deleteChannelAndCleanup = async (channelId: Types.ObjectId, session?: mongoose.ClientSession) => {
    const participants = await ChannelParticipantModel.find({ channel: channelId }).lean().session(session ?? null);
    const invites = await ChannelInviteModel.find({ channel: channelId }).lean().session(session ?? null);

    await ChannelParticipantModel.deleteMany({ channel: channelId }, { session });
    await ChannelInviteModel.deleteMany({ channel: channelId }, { session });
    await ChannelMessageModel.deleteMany({ channel: channelId }, { session });
    await ChannelModel.deleteOne({ _id: channelId }, { session });

    const userIds = new Set<string>([
        ...participants.map(x => x.user.toString()),
        ...invites.map(x => x.invitedUser.toString())
    ]);

    const socketRooms = Array.from(userIds).map(x => uidRoom(x));
    if (socketRooms.length > 0) {
        getIO()?.to(socketRooms).emit("channels:channel_deleted", { channelId });
    }
}

export const joinChannel = async (channelId: Types.ObjectId, userId: Types.ObjectId, session?: mongoose.ClientSession) => {
    const exists = await ChannelParticipantModel.exists({ channel: channelId, user: userId }).session(session ?? null);
    if (exists == null) {
        await ChannelParticipantModel.create([{ channel: channelId, user: userId }], { session });

        const joinMessage = new ChannelMessageModel({
            _type: ChannelMessageTypeEnum.USER_JOINED,
            content: "{action_user} joined",
            channel: channelId,
            user: userId
        });
        await saveChannelMessage(joinMessage, session);
    }
}

export const inviteToChannel = async (
    authorId: Types.ObjectId | string,
    invitedUserId: Types.ObjectId | string,
    channelId: Types.ObjectId | string,
    session?: mongoose.ClientSession
) => {
    const [doc] = await ChannelInviteModel.create([{
        author: authorId,
        invitedUser: invitedUserId,
        channel: channelId
    }], { session });

    const io = getIO();

    const author = await User.findById(doc.author, USER_MINIMAL_FIELDS).lean<UserMinimal & { _id: Types.ObjectId }>().session(session ?? null);
    if (!author) {
        throw new HttpError("Author not found", 404);
    }
    const channel = await ChannelModel.findById(doc.channel).lean().session(session ?? null);
    if (!channel) {
        throw new HttpError("Channel not found", 404);
    }

    await sendNotifications({
        title: "New invite",
        message: `${author.name} invited you to ${channel._type == ChannelTypeEnum.DM ? "DM" : "group"}`,
        type: NotificationTypeEnum.CHANNELS,
        actionUser: author._id,
        url: "/Channels"
    }, [doc.invitedUser], true, session);

    io?.to(uidRoom(doc.invitedUser.toString())).emit("channels:new_invite", {
        invite: {
            id: doc._id,
            author: formatUserMinimal(author),
            channel: formatChannelBase(channel),
            createdAt: doc.createdAt
        }
    });

    return doc;
}

export const processChannelInvite = async (invite: ChannelInvite & { _id: Types.ObjectId }, accepted: boolean, session?: mongoose.ClientSession) => {
    await ChannelInviteModel.deleteOne({ _id: invite._id }, { session });
    if (accepted) {
        await joinChannel(invite.channel, invite.invitedUser, session);
    } else {
        getIO()?.to(uidRoom(invite.invitedUser.toString())).emit("channels:invite_canceled", { inviteId: invite._id });
    }
}

export const saveChannelMessage = async (doc: DocumentType<ChannelMessage>, session?: mongoose.ClientSession) => {
    const isNew = doc.isNew;
    const contentModified = isNew || doc.isModified("content");
    const isDeleted = doc.isModified("deleted") && doc.deleted === true;

    await doc.save({ session });

    if (contentModified) {
        await updatePostAttachments(doc.content, { channelMessage: doc._id }, session);
    }

    const [participants, user] = await Promise.all([
        ChannelParticipantModel
            .find({ channel: doc.channel }, { user: 1, muted: 1, unreadCount: 1 })
            .lean()
            .session(session ?? null),
        User
            .findById(doc.user, USER_MINIMAL_FIELDS)
            .lean<UserMinimal & { _id: Types.ObjectId }>()
            .session(session ?? null)
    ]);

    if (!user) throw new HttpError("User not found", 404);

    const io = getIO();

    const allParticipantRooms = participants.map(p => uidRoom(p.user.toString()));

    if (isNew) {
        const channel = await ChannelModel.findById(doc.channel).session(session ?? null);
        if (!channel) throw new HttpError("Channel not found", 404);

        channel.lastMessage = doc._id;
        await channel.save({ session });

        await ChannelParticipantModel.updateMany(
            {
                channel: doc.channel,
                user: { $ne: doc.user },
                $or: [
                    { lastActiveAt: null },
                    { lastActiveAt: { $lt: doc.createdAt } }
                ]
            },
            { $inc: { unreadCount: 1 } },
            { session }
        );

        const [attachments, reply] = await Promise.all([
            getAttachmentsByPostId({ channelMessage: doc._id }),
            doc.repliedTo
                ? ChannelMessageModel
                    .findById(doc.repliedTo)
                    .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
                    .lean()
                    .session(session ?? null)
                : Promise.resolve(null)
        ]);

        const socketRooms = doc._type === ChannelMessageTypeEnum.USER_LEFT
            ? [...allParticipantRooms, uidRoom(user._id.toString())]
            : allParticipantRooms;

        if (socketRooms.length > 0) {
            io?.to(socketRooms).emit("channels:new_message", {
                message: {
                    id: doc._id,
                    type: doc._type,
                    channel: formatChannelBase(channel),
                    content: doc.content,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                    viewed: false,
                    deleted: doc.deleted,
                    user: formatUserMinimal(user),
                    repliedTo: reply ? {
                        id: reply._id,
                        content: reply.content,
                        createdAt: reply.createdAt,
                        updatedAt: reply.updatedAt,
                        user: formatUserMinimal(reply.user),
                        deleted: reply.deleted
                    } : null,
                    attachments
                }
            });

            const unmutedParticipantRooms = participants
                .filter(p => !p.user.equals(user._id) && !p.muted)
                .map(p => uidRoom(p.user.toString()));

            if (unmutedParticipantRooms.length > 0) {
                io?.to(unmutedParticipantRooms).emit("channels:new_message_info", { channelId: doc.channel });
            }

            const pushNotificationUserIds = participants
                .filter(p => !p.user.equals(user._id) && !p.muted && p.unreadCount == 0)
                .map(p => p.user);

            await sendNotifications(
                {
                    title: "New message",
                    type: NotificationTypeEnum.CHANNELS,
                    actionUser: user._id,
                    message: channel._type === ChannelTypeEnum.DM
                        ? `${user.name} sent you a message`
                        : `New messages in group ${channel.title}`,
                    url: "/Channels/" + channel._id
                },
                pushNotificationUserIds,
                true,
                session
            );
        }

    } else {
        if (contentModified) {
            const attachments = await getAttachmentsByPostId({ channelMessage: doc._id });
            if (allParticipantRooms.length > 0) {
                io?.to(allParticipantRooms).emit("channels:message_edited", {
                    messageId: doc._id,
                    channelId: doc.channel,
                    content: doc.content,
                    attachments,
                    updatedAt: new Date()
                });
            }
        }

        if (isDeleted) {
            if (allParticipantRooms.length > 0) {
                io?.to(allParticipantRooms).emit("channels:message_deleted", {
                    messageId: doc._id,
                    channelId: doc.channel
                });
            }
        }
    }
};

export const formatChannelBase = (channel: Channel & { _id: Types.ObjectId }) => {
    return {
        id: channel._id.toString(),
        type: channel._type,
        coverImageUrl: null,
        title: channel.title,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt
    };
}