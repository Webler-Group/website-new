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
import { getImageUrl } from "../controllers/mediaController";

export const deleteChannelAndCleanup = async (channelId: Types.ObjectId, session?: mongoose.ClientSession) => {
    await ChannelParticipantModel.deleteMany({ channel: channelId }, { session });
    await ChannelInviteModel.deleteMany({ channel: channelId }, { session });
    await ChannelMessageModel.deleteMany({ channel: channelId }, { session });
    await ChannelModel.deleteOne({ _id: channelId }, { session });
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

interface InviteToChannelParams {
    authorId: Types.ObjectId,
    invitedUserId: Types.ObjectId,
    channelId: Types.ObjectId
}

export const inviteToChannel = async (params: InviteToChannelParams, session?: mongoose.ClientSession) => {
    const [doc] = await ChannelInviteModel.create([{
        author: params.authorId,
        invitedUser: params.invitedUserId,
        channel: params.channelId
    }], { session });

    const io = getIO();

    const author = await User.findById(doc.author, USER_MINIMAL_FIELDS).lean<UserMinimal & { _id: Types.ObjectId }>().session(session ?? null);
    if (!author) {
        throw new HttpError("Author not found", 404);
    }
    const channel = await ChannelModel.findById(doc.channel, "title _type").session(session ?? null);
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
        id: doc._id,
        author: formatUserMinimal(author),
        channelId: channel._id,
        channelType: channel._type,
        channelTitle: channel.title,
        createdAt: doc.createdAt
    });
}

export const processChannelInvite = async (invite: ChannelInvite & { _id: Types.ObjectId }, accepted: boolean, session?: mongoose.ClientSession) => {
    if (accepted) {
        await joinChannel(invite.channel, invite.invitedUser, session);
    }
    await ChannelInviteModel.deleteOne({ _id: invite._id }, { session });
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

    const unmutedParticipantRooms = participants
        .filter(p => !p.user.equals(user._id) && !p.muted)
        .map(p => uidRoom(p.user.toString()));

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

        const pushNotificationUserIds = participants
            .filter(p => !p.user.equals(user._id) && !p.muted && (!p.unreadCount || p.unreadCount <= 1))
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

        io?.to(socketRooms).emit("channels:new_message", {
            message: {
                id: doc._id,
                type: doc._type,
                channelId: doc.channel.toString(),
                channelTitle: channel.title,
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

        io?.to(unmutedParticipantRooms).emit("channels:new_message_info", {});

    } else {
        if (contentModified) {
            const attachments = await getAttachmentsByPostId({ channelMessage: doc._id });
            io?.to(allParticipantRooms).emit("channels:message_edited", {
                messageId: doc._id.toString(),
                channelId: doc.channel.toString(),
                content: doc.content,
                attachments,
                updatedAt: new Date()
            });
        }

        if (isDeleted) {
            io?.to(allParticipantRooms).emit("channels:message_deleted", {
                messageId: doc._id.toString(),
                channelId: doc.channel.toString()
            });
        }
    }
};