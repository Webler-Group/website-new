import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import Channel from "../models/Channel";
import ChannelInvite from "../models/ChannelInvite";
import ChannelParticipant from "../models/ChannelParticipant";
import User from "../models/User";
import ChannelMessage from "../models/ChannelMessage";
import { Socket } from "socket.io";
import { getIO, uidRoom } from "../config/socketServer";
import PostAttachment from "../models/PostAttachment";
import mongoose from "mongoose";
import ChannelRolesEnum from "../data/ChannelRolesEnum";
import ChannelTypeEnum from "../data/ChannelTypeEnum";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";
import { truncate } from "../utils/StringUtils";
import {
    createGroupSchema,
    createDirectMessagesSchema,
    groupInviteUserSchema,
    getChannelSchema,
    getChannelsListSchema,
    getInvitesListSchema,
    acceptInviteSchema,
    groupRemoveUserSchema,
    leaveChannelSchema,
    getMessagesSchema,
    groupCancelInviteSchema,
    groupRenameSchema,
    groupChangeRoleSchema,
    deleteChannelSchema,
    muteChannelSchema,
    markMessagesSeenWSSchema,
    createMessageWSSchema,
    deleteMessageWSSchema,
    editMessageWSSchema
} from "../validation/channelsSchema";
import { parseWithZod } from "../utils/zodUtils";
import z from "zod";

const createGroup = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createGroupSchema, req);
    const { title } = body;
    const currentUserId = req.userId;

    const channel = await Channel.create({ _type: ChannelTypeEnum.GROUP, createdBy: currentUserId, title });
    await ChannelParticipant.create({ channel: channel._id, user: currentUserId, role: ChannelRolesEnum.OWNER });

    res.json({
        success: true,
        channel: {
            id: channel._id,
            type: channel._type,
            title: channel.title,
            updatedAt: channel.updatedAt
        }
    });
});

const createDirectMessages = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createDirectMessagesSchema, req);
    const { userId } = body;
    const currentUserId = req.userId;

    const DMUser = await User.findById(userId, "name avatarImage level roles");
    if (!DMUser) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    let channel = await Channel.where({
        _type: ChannelTypeEnum.DM,
        createdBy: { $in: [userId, currentUserId] },
        DMUser: { $in: [userId, currentUserId] }
    }).findOne();

    if (!channel) {
        channel = await Channel.create({ _type: ChannelTypeEnum.DM, createdBy: currentUserId, DMUser: userId });
        await ChannelParticipant.create({ channel: channel._id, user: currentUserId, role: ChannelRolesEnum.MEMBER });
    } else {
        const myInvite = await ChannelInvite.findOne({ channel: channel._id, invitedUser: currentUserId });
        if (myInvite) {
            await myInvite.accept();
        } else {
            await Channel.join(channel._id, new mongoose.Types.ObjectId(currentUserId));
        }
    }

    res.json({
        success: true,
        channel: {
            id: channel._id
        }
    });
});

const groupInviteUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupInviteUserSchema, req);
    const { channelId, userId } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant || ![ChannelRolesEnum.OWNER, ChannelRolesEnum.ADMIN].includes(participant.role)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const invitedUser = await User.findById(userId, "name avatarImage roles level");
    if (!invitedUser) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    if (await ChannelParticipant.findOne({ channel: channelId, user: invitedUser._id }, "_id")) {
        res.status(400).json({ error: [{ message: "Invited user is already a participant" }] });
        return;
    }

    const existingInvite = await ChannelInvite.findOne({ invitedUser: invitedUser._id, channel: channelId });
    if (existingInvite) {
        res.status(400).json({ error: [{ message: "Invite already exists" }] });
        return;
    }

    const invite = await ChannelInvite.create({ invitedUser: invitedUser._id, channel: channelId, author: currentUserId });

    res.json({
        success: true,
        invite: {
            id: invite._id,
            invitedUserId: invitedUser._id,
            invitedUserName: invitedUser.name,
            invitedUserAvatar: invitedUser.avatarImage,
            createdAt: invite.createdAt
        }
    });
});

const getChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChannelSchema, req);
    const { channelId, includeParticipants, includeInvites } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
        return;
    }

    const channel = await Channel.findById(channelId)
        .populate<{ DMUser: any }>("DMUser", "name avatarImage level roles")
        .populate<{ createdBy: any }>("createdBy", "name avatarImage level roles")
        .lean();
    if (!channel) {
        res.status(404).json({ error: [{ message: "Channel not found" }] });
        return;
    }

    const data: any = {
        id: channel._id,
        title: channel._type === ChannelTypeEnum.GROUP ? channel.title : channel.DMUser?._id == currentUserId ? channel.createdBy.name : channel.DMUser?.name,
        coverImage: channel.DMUser?._id == currentUserId ? channel.createdBy.avatarImage : channel.DMUser?.avatarImage,
        type: channel._type,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        lastActiveAt: participant.lastActiveAt,
        unreadCount: participant.unreadCount,
        muted: participant.muted
    };

    if (includeInvites) {
        const invites = await ChannelInvite.find({ channel: channelId })
            .populate<{ author: any }>("author", "name avatarImage level roles")
            .populate<{ invitedUser: any }>("invitedUser", "name avatarImage level roles")
            .lean();
        data.invites = invites.map(x => ({
            id: x._id,
            authorId: x.author._id,
            authorName: x.author.name,
            authorAvatar: x.author.avatarImage,
            invitedUserId: x.invitedUser._id,
            invitedUserName: x.invitedUser.name,
            invitedUserAvatar: x.invitedUser.avatarImage
        }));
    }

    if (includeParticipants) {
        const participants = await ChannelParticipant.find({ channel: channelId })
            .populate<{ user: any }>("user", "name avatarImage level roles")
            .lean();
        data.participants = participants.map((x) => ({
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            role: x.role
        }));
    }

    res.json({
        success: true,
        channel: data
    });
});

const getChannelsList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChannelsListSchema, req);
    const { fromDate, count } = body;
    const currentUserId = req.userId;

    const participantChannels = await ChannelParticipant.find({ user: currentUserId })
        .select('channel lastActiveAt muted unreadCount');

    const channelIds = participantChannels.map(p => p.channel);

    let query = Channel.find({ _id: { $in: channelIds } });
    if (fromDate) {
        query = query.where({ updatedAt: { $lt: new Date(fromDate) } });
    }

    const channels = await query
        .sort({ updatedAt: -1 })
        .limit(count)
        .populate<{ DMUser: any }>("DMUser", "name avatarImage level roles")
        .populate<{ createdBy: any }>("createdBy", "name avatarImage level roles")
        .populate<{ lastMessage: any }>({
            path: "lastMessage",
            select: "user content _type createdAt deleted",
            populate: {
                path: "user",
                select: "name avatarImage"
            }
        })
        .lean();

    const participantData = channels.map((channel) => {
        const participant = participantChannels.find(y => y.channel.equals(channel._id));
        return { channelId: channel._id.toString(), unreadCount: participant?.unreadCount || 0, muted: participant?.muted };
    });

    const participantDataMap = Object.fromEntries(participantData.map(u => [u.channelId, { ...u }]));

    res.json({
        success: true,
        channels: channels.map(x => {
            const lastActiveAt = participantChannels.find(y => y.channel.equals(x._id))?.lastActiveAt;
            return {
                id: x._id,
                type: x._type,
                title: x._type === ChannelTypeEnum.GROUP ? x.title : x.DMUser?._id == currentUserId ? x.createdBy.name : x.DMUser?.name,
                coverImage: x.DMUser?._id == currentUserId ? x.createdBy.avatarImage : x.DMUser?.avatarImage,
                createdAt: x.createdAt,
                updatedAt: x.updatedAt,
                unreadCount: participantDataMap[x._id.toString()]?.unreadCount || 0,
                muted: participantDataMap[x._id.toString()]?.muted,
                lastMessage: x.lastMessage ? {
                    type: x.lastMessage._type,
                    id: x.lastMessage._id,
                    deleted: x.lastMessage.deleted,
                    content: x.lastMessage.deleted ? "" : x.lastMessage.content,
                    createdAt: x.lastMessage.createdAt,
                    userId: x.lastMessage.user._id,
                    userName: x.lastMessage.user.name,
                    userAvatar: x.lastMessage.user.avatarImage,
                    viewed: lastActiveAt ? lastActiveAt >= x.lastMessage.createdAt : false
                } : null
            }
        })
    });
});

const getInvitesList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getInvitesListSchema, req);
    const { fromDate, count } = body;
    const currentUserId = req.userId;

    let query = ChannelInvite.find({ invitedUser: currentUserId });
    if (fromDate) {
        query = query.where({ createdAt: { $lt: new Date(fromDate) } });
    }

    const invites = await query
        .sort({ createdAt: -1 })
        .limit(count)
        .populate<{ author: any }>("author", "name avatarImage level roles")
        .populate<{ channel: any }>("channel", "title _type")
        .lean();

    const totalCount = await ChannelInvite.countDocuments({ invitedUser: currentUserId });

    res.json({
        success: true,
        invites: invites.map(x => ({
            id: x._id,
            authorId: x.author._id,
            authorName: x.author.name,
            authorAvatar: x.author.avatarImage,
            channelId: x.channel._id,
            channelType: x.channel._type,
            channelTitle: x.channel.title,
            createdAt: x.createdAt
        })),
        count: totalCount
    });
});

const acceptInvite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(acceptInviteSchema, req);
    const { inviteId, accepted } = body;
    const currentUserId = req.userId;

    const invite = await ChannelInvite.findById(inviteId);
    if (!invite) {
        res.status(404).json({ error: [{ message: "Invite not found" }] });
        return;
    }

    if (!invite.invitedUser.equals(currentUserId!)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    await invite.accept(accepted);

    res.json({ success: true, data: { accepted } });
});

const groupRemoveUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupRemoveUserSchema, req);
    const { channelId, userId } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant || ![ChannelRolesEnum.OWNER, ChannelRolesEnum.ADMIN].includes(participant.role)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const targetParticipant = await ChannelParticipant.findOne({ channel: channelId, user: userId });
    if (!targetParticipant || targetParticipant.role === ChannelRolesEnum.OWNER || participant.role === targetParticipant.role) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    await targetParticipant.deleteOne();

    await ChannelMessage.create({
        _type: ChannelMessageTypeEnum.USER_LEFT,
        content: "{action_user} was removed",
        channel: channelId,
        user: userId
    });

    res.json({ success: true });
});

const leaveChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(leaveChannelSchema, req);
    const { channelId } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
        return;
    }

    const result = await ChannelParticipant.deleteOne({ user: currentUserId, channel: channelId });
    if (result.deletedCount === 1) {
        await ChannelMessage.create({
            _type: ChannelMessageTypeEnum.USER_LEFT,
            content: "{action_user} left",
            channel: channelId,
            user: currentUserId
        });
    }
    res.json({ success: true });
});

const getMessages = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getMessagesSchema, req);
    const { channelId, count, fromDate } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
        return;
    }

    let query = ChannelMessage.find({ channel: channelId });
    if (fromDate) {
        query = query.where({ createdAt: { $lt: new Date(fromDate) } });
    }

    const messages = await query
        .sort({ createdAt: -1 })
        .limit(count)
        .populate<{ user: any }>("user", "name avatarImage level roles")
        .populate<{ repliedTo: any }>({
            path: "repliedTo",
            select: "content createdAt updatedAt deleted user",
            populate: {
                path: "user",
                select: "name avatarImage"
            }
        })
        .lean();

    const data = messages.map(x => ({
        id: x._id,
        type: x._type,
        userId: x.user._id,
        userName: x.user.name,
        userAvatar: x.user.avatarImage,
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
        content: x.deleted ? "" : x.content,
        deleted: x.deleted,
        repliedTo: x.repliedTo ? {
            id: x.repliedTo._id,
            content: x.repliedTo.deleted ? "" : truncate(x.repliedTo.content, 50),
            createdAt: x.repliedTo.createdAt,
            updatedAt: x.repliedTo.updatedAt,
            userId: x.repliedTo.user._id,
            userName: x.repliedTo.user.name,
            userAvatar: x.repliedTo.user.avatarImage,
            deleted: x.repliedTo.deleted
        } : null,
        channelId: x.channel,
        viewed: participant.lastActiveAt ? participant.lastActiveAt >= x.createdAt : false,
        attachments: new Array()
    }));

    const promises = data.map((item, i) =>
        item.deleted ? Promise.resolve() :
            PostAttachment.getByPostId({ channelMessage: item.id }).then(attachments => {
                data[i].attachments = attachments;
            })
    );

    await Promise.all(promises);

    res.json({
        success: true,
        messages: data
    });
});

const groupCancelInvite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupCancelInviteSchema, req);
    const { inviteId } = body;
    const currentUserId = req.userId;

    const invite = await ChannelInvite.findById(inviteId);
    if (!invite) {
        res.status(404).json({ error: [{ message: "Invite not found" }] });
        return;
    }

    const participant = await ChannelParticipant.findOne({ channel: invite.channel, user: currentUserId });
    if (!participant || ![ChannelRolesEnum.OWNER, ChannelRolesEnum.ADMIN].includes(participant.role)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    await invite.deleteOne();

    const io = getIO();
    if (io) {
        io.to(uidRoom(invite.invitedUser.toString())).emit("channels:invite_canceled", {
            inviteId
        });
    }

    res.json({ success: true });
});

const groupRename = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupRenameSchema, req);
    const { channelId, title } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant || participant.role !== ChannelRolesEnum.OWNER) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    await Channel.updateOne({ _id: channelId }, { title });

    await ChannelMessage.create({
        _type: ChannelMessageTypeEnum.TITLE_CHANGED,
        content: "{action_user} renamed the group to " + title,
        channel: channelId,
        user: currentUserId
    });

    res.json({
        success: true,
        data: { title }
    });
});

const groupChangeRole = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupChangeRoleSchema, req);
    const { userId, channelId, role } = body;
    const currentUserId = req.userId;

    const currentParticipant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!currentParticipant || currentParticipant.role !== ChannelRolesEnum.OWNER) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const targetParticipant = await ChannelParticipant.findOne({ channel: channelId, user: userId });
    if (!targetParticipant) {
        res.status(404).json({ error: [{ message: "Target user is not a participant" }] });
        return;
    }

    if (userId === currentUserId) {
        res.status(400).json({ error: [{ message: "You cannot change your own role" }] });
        return;
    }

    if (role === ChannelRolesEnum.OWNER) {
        await ChannelParticipant.updateOne(
            { channel: channelId, user: currentUserId },
            { role: ChannelRolesEnum.ADMIN }
        );
    }

    targetParticipant.role = role;
    await targetParticipant.save();

    res.json({ success: true, data: { userId, role } });
});

const deleteChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteChannelSchema, req);
    const { channelId } = body;
    const currentUserId = req.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) {
        res.status(404).json({ error: [{ message: "Channel not found" }] });
        return;
    }

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
        return;
    }

    if (channel._type !== ChannelTypeEnum.DM && participant.role !== ChannelRolesEnum.OWNER) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const participants = await ChannelParticipant.find({ channel: channelId });

    await channel.deleteOne();

    const io = getIO();
    if (io) {
        io.to(participants.map(x => uidRoom(x.user.toString()))).emit("channels:channel_deleted", {
            channelId
        });
    }

    res.json({ success: true });
});

const getUnseenMessagesCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const results = await ChannelParticipant.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(currentUserId),
                muted: false
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$unreadCount" }
            }
        }
    ]);

    const unseenMessagesCount = results.length > 0 ? results[0].total : 0;
    const invitesCount = await ChannelInvite.countDocuments({ invitedUser: currentUserId });
    const totalCount = unseenMessagesCount + invitesCount;

    res.json({ success: true, count: totalCount });
});

const muteChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(muteChannelSchema, req);
    const { channelId, muted } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
        return;
    }

    participant.muted = muted;
    await participant.save();

    res.json({
        success: true,
        data: {
            muted: participant.muted
        }
    });
});

const markMessagesSeenWS = async (socket: Socket, payload: any) => {
    try {
        const { channelId } = markMessagesSeenWSSchema.parse(payload);
        const currentUserId = socket.data.userId;

        const participant = await ChannelParticipant.findOne({ user: currentUserId, channel: channelId });
        if (!participant) {
            socket.emit("channels:error", { error: [{ message: "Not a member of this channel" }] });
            return;
        }

        participant.lastActiveAt = new Date();
        participant.unreadCount = 0;
        await participant.save();

        socket.emit("channels:messages_seen", {
            channelId,
            userId: currentUserId,
            lastActiveAt: participant.lastActiveAt
        });
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        } else {
            console.log("Mark messages seen failed:", err.message);
        }
    }
};

const createMessageWS = async (socket: Socket, payload: any) => {
    try {
        const { channelId, content, repliedTo } = createMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;

        const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
        if (!participant) {
            socket.emit("channels:error", { error: [{ message: "Not a member of this channel" }] });
            return;
        }

        const newMessage = await ChannelMessage.create({
            _type: ChannelMessageTypeEnum.MESSAGE,
            content,
            channel: channelId,
            repliedTo,
            user: currentUserId
        });

        const channel = await Channel.findById(newMessage.channel).select("_type createdBy DMUser").lean();

        if (channel && channel._type === ChannelTypeEnum.DM) {
            const messages = await ChannelMessage.find({ channel: channel._id }).limit(2).lean();
            if (messages.length === 1) {
                const exists = await ChannelParticipant.exists({ channel: channel._id, user: channel.DMUser });
                if (!exists) {
                    await ChannelInvite.create({ channel: channel._id, author: channel.createdBy, invitedUser: channel.DMUser });
                }
            }
        }
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        } else {
            console.log("Message could not be created:", err.message);
        }
    }
};

const deleteMessageWS = async (socket: Socket, payload: any) => {
    try {
        const { messageId } = deleteMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;

        const message = await ChannelMessage.findById(messageId);
        if (!message || message.user != currentUserId) {
            socket.emit("channels:error", { error: [{ message: "Message not found or unauthorized" }] });
            return;
        }

        message.deleted = true;
        await message.save();
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        } else {
            console.log("Message could not be deleted:", err.message);
        }
    }
};

const editMessageWS = async (socket: Socket, payload: any) => {
    try {
        const { messageId, content } = editMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;

        const message = await ChannelMessage.findById(messageId);
        if (!message || message.user != currentUserId) {
            socket.emit("channels:error", { error: [{ message: "Message not found or unauthorized" }] });
            return;
        }

        message.content = content;
        await message.save();
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        } else {
            console.log("Message could not be edited:", err.message);
        }
    }
};

const registerHandlersWS = (socket: Socket) => {
    socket.on("channels:messages_seen", (payload) => {
        markMessagesSeenWS(socket, payload);
    });
    socket.on("channels:send_message", (payload) => {
        createMessageWS(socket, payload);
    });
    socket.on("channels:delete_message", (payload) => {
        deleteMessageWS(socket, payload);
    });
    socket.on("channels:edit_message", (payload) => {
        editMessageWS(socket, payload);
    });
}

const channelsController = {
    createGroup,
    createDirectMessages,
    groupInviteUser,
    getChannel,
    getChannelsList,
    acceptInvite,
    getInvitesList,
    getMessages,
    groupRemoveUser,
    leaveChannel,
    groupCancelInvite,
    getUnseenMessagesCount,
    groupRename,
    groupChangeRole,
    deleteChannel,
    muteChannel
}

export {
    registerHandlersWS
}

export default channelsController;