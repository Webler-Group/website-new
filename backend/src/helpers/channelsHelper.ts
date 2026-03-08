import mongoose, { Types } from "mongoose";
import ChannelParticipantModel from "../models/ChannelParticipant";
import ChannelInviteModel, { ChannelInvite } from "../models/ChannelInvite";
import ChannelMessageModel, { ChannelMessage } from "../models/ChannelMessage";
import ChannelModel from "../models/Channel";
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
    await ChannelParticipantModel.deleteMany({ channel: channelId }, { session });
    await ChannelInviteModel.deleteMany({ channel: channelId }, { session });
    await ChannelMessageModel.deleteMany({ channel: channelId }, { session });
    await ChannelModel.deleteOne({ _id: channelId }, { session });
}

export const joinChannel = async (channelId: Types.ObjectId, userId: Types.ObjectId, session?: mongoose.ClientSession) => {
    const exists = await ChannelParticipantModel.exists({ channel: channelId, user: userId }).session(session ?? null);
    if (exists == null) {
        await ChannelParticipantModel.create([{ channel: channelId, user: userId }], { session });

        await sendChannelMessage({
            type: ChannelMessageTypeEnum.USER_JOINED,
            content: "{action_user} joined",
            channelId: channelId,
            userId: userId
        }, session);
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

export const updateChannelMessage = async (message: DocumentType<ChannelMessage>, session?: mongoose.ClientSession) => {
    await message.save({ session });

    const participants = await ChannelParticipantModel.find({ channel: message.channel }, { user: 1 }).lean<{ user: Types.ObjectId }[]>().session(session ?? null);
    const participantsIds = participants.map(x => x.user);

    const io = getIO();
    if (message.isModified("content")) {
        await updatePostAttachments(message.content, { channelMessage: message._id });
        const attachments = await getAttachmentsByPostId({ channelMessage: message._id });
        io?.to(participantsIds.map(userId => uidRoom(userId.toString()))).emit("channels:message_edited", {
            messageId: message._id.toString(),
            channelId: message.channel.toString(),
            content: message.content,
            attachments,
            updatedAt: new Date()
        });
    }
    if (message.isModified("deleted") && message.deleted === true) {
        io?.to(participantsIds.map(userId => uidRoom(userId.toString()))).emit("channels:message_deleted", {
            messageId: message._id.toString(),
            channelId: message.channel.toString()
        });
    }
}

interface SendChannelMessageParams {
    type: ChannelMessageTypeEnum,
    userId: Types.ObjectId,
    channelId: Types.ObjectId,
    content: string,
    repliedTo?: Types.ObjectId | null
}

export const sendChannelMessage = async (params: SendChannelMessageParams, session?: mongoose.ClientSession) => {
    const [doc] = await ChannelMessageModel.create([{
        _type: params.type,
        content: params.content,
        channel: params.channelId,
        user: params.userId,
        repliedTo: params.repliedTo
    }], { session });

    const channel = await ChannelModel.findById(doc.channel).session(session ?? null);
    if (!channel) {
        throw new HttpError("Channel not found", 404);
    }

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

    const user = await User.findById(doc.user, USER_MINIMAL_FIELDS).lean<UserMinimal & { _id: Types.ObjectId }>().session(session ?? null);
    if (!user) {
        throw new HttpError("User not found", 404);
    }

    const participants = await ChannelParticipantModel.find({ channel: doc.channel }, { user: 1, muted: 1, unreadCount: 1 }).lean().session(session ?? null);

    const userIdsToNotify = participants
        .filter(p => !p.user.equals(user._id) && !p.muted && (!p.unreadCount || p.unreadCount <= 1))
        .map(p => p.user);

    await sendNotifications(
        {
            title: "New message",
            type: NotificationTypeEnum.CHANNELS,
            actionUser: user._id,
            message: channel._type == ChannelTypeEnum.DM
                ? user.name + " sent you message"
                : "New messages in group " + channel.title,
            url: "/Channels/" + channel._id
        },
        userIdsToNotify,
        true,
        session
    );

    const io = getIO();

    await updatePostAttachments(doc.content, { channelMessage: doc._id });
    const attachments = await getAttachmentsByPostId({ channelMessage: doc._id });

    let channelTitle = "";
    const userIds = participants.map(user => user.user);
    const userIdsNotMuted = participants.filter(x => !x.muted).map(x => x.user);

    if (doc._type == ChannelMessageTypeEnum.USER_LEFT) {
        userIds.push(user._id);
    } else if (doc._type == ChannelMessageTypeEnum.TITLE_CHANGED) {
        channelTitle = channel.title!;
    }

    const reply = doc.repliedTo
        ? await ChannelMessageModel.findById(doc.repliedTo)
            .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
            .lean()
            .session(session ?? null)
        : null;

    io?.to(userIds.map(x => uidRoom(x.toString()))).emit("channels:new_message", {
        id: doc._id,
        type: doc._type,
        channelId: doc.channel.toString(),
        channelTitle,
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
    });

    io?.to(userIdsNotMuted.map(x => uidRoom(x.toString()))).emit("channels:new_message_info", {});

    return doc;
}