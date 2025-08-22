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

const createGroup = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { title } = req.body;
    const currentUserId = req.userId;

    if (typeof title !== "string" || title.length < 3 || title.length > 20) {
        res.status(400).json({ message: "Title must be string of 3 - 20 characters" });
        return;
    }

    const channel = await Channel.create({ _type: 2, createdBy: currentUserId, title });

    await ChannelParticipant.create({ channel: channel._id, user: currentUserId, role: "Owner" });

    res.json({
        channel: {
            id: channel._id,
            type: channel._type,
            title: channel.title,
            updatedAt: channel.updatedAt
        }
    });
});

const createDirectMessages = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { userId } = req.body;
    const currentUserId = req.userId;

    const DMUser = await User.findById(userId, "name avatarImage level roles");
    if (!DMUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    let channel = await Channel.where({ _type: 1, createdBy: { $in: [userId, currentUserId] }, DMUser: { $in: [userId, currentUserId] } }).findOne();

    if (!channel) {
        channel = await Channel.create({ _type: 1, createdBy: currentUserId, DMUser: userId });

        await ChannelParticipant.create({ channel: channel._id, user: currentUserId, role: "Member" });
        await ChannelInvite.create({ channel: channel._id, author: channel.createdBy, invitedUser: channel.DMUser });

    } else {
        const myInvite = await ChannelInvite.findOne({ channel: channel._id, invitedUser: currentUserId });
        if (myInvite) {
            await myInvite.accept();
        }
    }

    res.json({
        channel: {
            id: channel._id
        }
    });
});

const groupInviteUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { channelId, username } = req.body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant || !["Owner", "Admin"].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    const invitedUser = await User.findOne({ name: username }, "_id name avatarImage");
    if (!invitedUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    if ((await ChannelParticipant.findOne({ channel: channelId, user: invitedUser._id }, "_id")) != null) {
        res.status(400).json({ message: "Invited user is already participant" });
        return;
    }

    let invite = await ChannelInvite.findOne({ invitedUser: invitedUser._id, channel: channelId });
    if (invite) {
        res.status(400).json({ message: "Invite already exists" });
        return;
    }

    invite = await ChannelInvite.create({ invitedUser: invitedUser._id, channel: channelId, author: currentUserId });

    res.json({
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
    const { channelId, includeParticipants, includeInvites } = req.body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }

    const channel = await Channel.findById(channelId)
        .populate<{ DMUser: any }>("DMUser", "name avatarImage level roles")
        .populate<{ createdBy: any }>("createdBy", "name avatarImage level roles")
        .lean();
    if (!channel) {
        res.status(404).json({ message: "Channel not found" });
        return;
    }

    const unreadCount = await ChannelMessage.countDocuments({
        channel: channel._id,
        createdAt: { $gt: participant.lastActiveAt }
    });

    const data: any = {
        id: channel._id,
        title: channel._type == 2 ? channel.title : channel.DMUser?._id == currentUserId ? channel.createdBy.name : channel.DMUser?.name,
        coverImage: channel.DMUser?._id == currentUserId ? channel.createdBy.avatarImage : channel.DMUser?.avatarImage,
        type: channel._type,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        lastActiveAt: participant.lastActiveAt,
        unreadCount
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
            .populate<{ user: any }>("user", "name avatarImage level roles") // Assumes user ref is populated
            .lean();
        data.participants = participants.map((x) => ({
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            role: x.role
        }));
    }

    res.json({
        channel: data
    });
});

const getChannelsList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { fromDate, count } = req.body;
    const currentUserId = req.userId;

    // First find all channels where user is participant
    const participantChannels = await ChannelParticipant.find({ user: currentUserId })
        .select('channel lastActiveAt');

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
            select: "user content _type createdAt",
            populate: {
                path: "user",
                select: "name avatarImage"
            }
        })
        .lean();

    const unreadCounts = await Promise.all(
        channels.map(async (channel) => {
            const participant = participantChannels.find(y => y.channel.equals(channel._id));
            const lastActiveAt = participant?.lastActiveAt || new Date(0);

            const unreadCount = await ChannelMessage.countDocuments({
                channel: channel._id,
                createdAt: { $gt: lastActiveAt }
            });

            return { channelId: channel._id.toString(), unreadCount };
        })
    );

    const unreadCountMap = Object.fromEntries(unreadCounts.map(u => [u.channelId, u.unreadCount]));

    res.json({
        channels: channels.map(x => {
            const lastActiveAt = participantChannels.find(y => y.channel.equals(x._id))?.lastActiveAt;
            return {
                id: x._id,
                type: x._type,
                title: x._type == 2 ? x.title : x.DMUser?._id == currentUserId ? x.createdBy.name : x.DMUser?.name,
                coverImage: x.DMUser?._id == currentUserId ? x.createdBy.avatarImage : x.DMUser?.avatarImage,
                createdAt: x.createdAt,
                updatedAt: x.updatedAt,
                unreadCount: unreadCountMap[x._id.toString()] || 0,
                lastMessage: x.lastMessage ? {
                    type: x.lastMessage._type,
                    id: x.lastMessage._id,
                    content: x.lastMessage.content,
                    createdAt: x.lastMessage.createdAt,
                    userId: x.lastMessage.user._id,
                    userName: x.lastMessage.user.name,
                    userAvatar: x.lastMessage.user.avatarImage,
                    viewed: lastActiveAt
                        ? lastActiveAt >= x.lastMessage.createdAt
                        : false

                } : null
            }
        })
    });
});

const getInvitesList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { fromDate, count } = req.body;
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
    const { inviteId, accepted } = req.body;
    const currentUserId = req.userId;

    const invite = await ChannelInvite.findById(inviteId);

    if (!invite) {
        res.status(403).json({ message: "Invite not found" });
        return;
    }

    if (!invite.invitedUser.equals(currentUserId!)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    await invite.accept(accepted);

    if (accepted) {
        await ChannelMessage.create({
            _type: 2,
            content: "{action_user} joined",
            channel: invite.channel,
            user: currentUserId
        });
    }

    res.json({ success: true, data: { accepted } });
});

const groupRemoveUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { channelId, userId } = req.body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant || !["Owner", "Admin"].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    const targetParticipant = await ChannelParticipant.findOne({ channel: channelId, user: userId });
    if (!targetParticipant || targetParticipant.role == "Owner" || participant.role == targetParticipant.role) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    await targetParticipant.deleteOne();

    await ChannelMessage.create({
        _type: 3,
        content: "{action_user} was removed",
        channel: channelId,
        user: userId
    });

    res.json({ success: true });
});

const leaveChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { channelId } = req.body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }

    const result = await ChannelParticipant.deleteOne({ user: currentUserId, channel: channelId });
    if (result.deletedCount === 1) {
        await ChannelMessage.create({
            _type: 3,
            content: "{action_user} left",
            channel: channelId,
            user: currentUserId
        });

        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

const createMessage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { channelId, content } = req.body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }

    const message = await ChannelMessage.create({
        _type: 1,
        content,
        channel: channelId,
        user: currentUserId
    });

    res.json({
        message: {
            id: message._id,
            type: message._type,
            createdAt: message.createdAt
        }
    });
});

const getMessages = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { channelId, count, fromDate } = req.body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId })
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
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
        .lean();

    const data = messages.map(x => ({
        id: x._id,
        type: x._type,
        userId: x.user._id,
        userName: x.user.name,
        userAvatar: x.user.avatarImage,
        createdAt: x.createdAt,
        content: x.content,
        channelId: x.channel,
        viewed: participant.lastActiveAt ? participant.lastActiveAt >= x.createdAt : false,
        attachments: new Array()
    }));

    let promises = [];

    for (let i = 0; i < data.length; ++i) {
        promises.push(PostAttachment.getByPostId({ channelMessage: data[i].id }).then(attachments => data[i].attachments = attachments));
    }

    await Promise.all(promises);

    res.json({
        messages: data
    });
});

const groupCancelInvite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { inviteId } = req.body;
    const currentUserId = req.userId;

    const invite = await ChannelInvite.findById(inviteId);
    if (!invite) {
        res.status(404).json({ message: "Invite not found" });
        return;
    }

    const participant = await ChannelParticipant.findOne({ channel: invite.channel, user: currentUserId });
    if (!participant || !["Owner", "Admin"].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    await invite.deleteOne();

    const io = getIO();
    if (io) {
        io.to(uidRoom(invite.invitedUser.toString())).emit("channels:invite_canceled", {
            inviteId
        });
    }

    res.json({
        success: true
    });
});

const groupRename = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { channelId, title } = req.body;
    const currentUserId = req.userId;

    if (typeof title !== "string" || title.length < 3 || title.length > 20) {
        res.status(400).json({ message: "Title must be string of 3 - 20 characters" });
        return;
    }

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant || participant.role !== "Owner") {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    try {
        await Channel.updateOne({ _id: channelId }, { title });

        await ChannelMessage.create({
            _type: 4,
            content: "{action_user} renamed the group to " + title,
            channel: channelId,
            user: currentUserId
        });

        res.json({
            success: true,
            data: {
                title
            }
        });
    } catch (err: any) {
        res.json({
            success: false,
            message: err?.message
        });
    }
});

const groupChangeRole = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { userId, channelId, role } = req.body;
    const currentUserId = req.userId;

    if (!["Owner", "Admin", "Member"].includes(role)) {
        res.status(400).json({ message: "Invalid role" });
        return;
    }

    const currentParticipant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!currentParticipant || currentParticipant.role !== "Owner") {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    const targetParticipant = await ChannelParticipant.findOne({ channel: channelId, user: userId });
    if (!targetParticipant) {
        res.status(404).json({ message: "Target user is not a participant" });
        return;
    }

    if (userId === currentUserId) {
        res.status(400).json({ message: "You cannot change your own role" });
        return;
    }

    if (role === "Owner") {
        await ChannelParticipant.updateOne(
            { channel: channelId, user: currentUserId },
            { role: "Admin" }
        );
    }

    targetParticipant.role = role;
    await targetParticipant.save();

    res.json({ success: true, data: { userId, role } });
});


const deleteChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { channelId } = req.body;
    const currentUserId = req.userId;

    const channel = await Channel.findById(channelId);
    if (!channel) {
        res.status(404).json({ message: "Channel not found" });
        return;
    }

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }

    if (channel._type !== 1 && "Owner" !== participant.role) {
        res.status(403).json({ message: "Unauthorized" });
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

    // Count unseen messages
    const results = await ChannelMessage.aggregate([
        {
            $lookup: {
                from: "channelparticipants",
                let: { channelId: "$channel", msgCreatedAt: "$createdAt" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$user", new mongoose.Types.ObjectId(currentUserId)] },
                                    { $eq: ["$channel", "$$channelId"] },
                                    {
                                        $or: [
                                            { $eq: ["$lastActiveAt", null] },
                                            { $lt: ["$lastActiveAt", "$$msgCreatedAt"] }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                as: "participant"
            }
        },
        { $match: { participant: { $ne: [] }, deleted: false } },
        { $count: "total" }
    ]);

    const unseenMessagesCount = results.length > 0 ? results[0].total : 0;

    // Count invites
    const invitesCount = await ChannelInvite.countDocuments({ invitedUser: currentUserId });

    // Sum up
    const totalCount = unseenMessagesCount + invitesCount;

    res.json({ count: totalCount });
});


const markMessagesSeenWS = async (socket: Socket, payload: any) => {
    const { channelId } = payload;
    const currentUserId = socket.data.userId;

    const participant = await ChannelParticipant.findOne({ user: currentUserId, channel: channelId });
    if (!participant) {
        return;
    }

    participant.lastActiveAt = new Date();
    await participant.save();

    socket.emit("channels:messages_seen", {
        channelId,
        userId: currentUserId,
        lastActiveAt: participant.lastActiveAt
    });
}

const createMessageWS = async (socket: Socket, payload: any) => {
    const { channelId, content } = payload;
    const currentUserId = socket.data.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        return;
    }

    await ChannelMessage.create({
        _type: 1,
        content,
        channel: channelId,
        user: currentUserId
    });
}

const registerHandlersWS = (socket: Socket) => {
    socket.on("channels:messages_seen", (payload) => {
        markMessagesSeenWS(socket, payload);
    });
    socket.on("channels:send_message", (payload) => {
        createMessageWS(socket, payload);
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
    createMessage,
    getMessages,
    groupRemoveUser,
    leaveChannel,
    groupCancelInvite,
    getUnseenMessagesCount,
    groupRename,
    groupChangeRole,
    deleteChannel
}

export {
    registerHandlersWS
}

export default channelsController;