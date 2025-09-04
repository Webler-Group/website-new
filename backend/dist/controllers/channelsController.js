"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandlersWS = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Channel_1 = __importDefault(require("../models/Channel"));
const ChannelInvite_1 = __importDefault(require("../models/ChannelInvite"));
const ChannelParticipant_1 = __importDefault(require("../models/ChannelParticipant"));
const User_1 = __importDefault(require("../models/User"));
const ChannelMessage_1 = __importDefault(require("../models/ChannelMessage"));
const socketServer_1 = require("../config/socketServer");
const PostAttachment_1 = __importDefault(require("../models/PostAttachment"));
const mongoose_1 = __importDefault(require("mongoose"));
const ChannelRolesEnum_1 = __importDefault(require("../data/ChannelRolesEnum"));
const ChannelTypeEnum_1 = __importDefault(require("../data/ChannelTypeEnum"));
const ChannelMessageTypeEnum_1 = __importDefault(require("../data/ChannelMessageTypeEnum"));
const createGroup = (0, express_async_handler_1.default)(async (req, res) => {
    const { title } = req.body;
    const currentUserId = req.userId;
    if (typeof title !== "string" || title.length < 3 || title.length > 20) {
        res.status(400).json({ message: "Title must be string of 3 - 20 characters" });
        return;
    }
    const channel = await Channel_1.default.create({ _type: ChannelTypeEnum_1.default.GROUP, createdBy: currentUserId, title });
    await ChannelParticipant_1.default.create({ channel: channel._id, user: currentUserId, role: ChannelRolesEnum_1.default.OWNER });
    res.json({
        channel: {
            id: channel._id,
            type: channel._type,
            title: channel.title,
            updatedAt: channel.updatedAt
        }
    });
});
const createDirectMessages = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.userId;
    const DMUser = await User_1.default.findById(userId, "name avatarImage level roles");
    if (!DMUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    let channel = await Channel_1.default.where({ _type: ChannelTypeEnum_1.default.DM, createdBy: { $in: [userId, currentUserId] }, DMUser: { $in: [userId, currentUserId] } }).findOne();
    if (!channel) {
        channel = await Channel_1.default.create({ _type: ChannelTypeEnum_1.default.DM, createdBy: currentUserId, DMUser: userId });
        await ChannelParticipant_1.default.create({ channel: channel._id, user: currentUserId, role: ChannelRolesEnum_1.default.MEMBER });
        await ChannelInvite_1.default.create({ channel: channel._id, author: channel.createdBy, invitedUser: channel.DMUser });
    }
    else {
        const myInvite = await ChannelInvite_1.default.findOne({ channel: channel._id, invitedUser: currentUserId });
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
const groupInviteUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId, userId } = req.body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant || ![ChannelRolesEnum_1.default.OWNER, ChannelRolesEnum_1.default.ADMIN].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    const invitedUser = await User_1.default.findById(userId, "name avatarImage roles level");
    if (!invitedUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    if ((await ChannelParticipant_1.default.findOne({ channel: channelId, user: invitedUser._id }, "_id")) != null) {
        res.status(400).json({ message: "Invited user is already participant" });
        return;
    }
    let invite = await ChannelInvite_1.default.findOne({ invitedUser: invitedUser._id, channel: channelId });
    if (invite) {
        res.status(400).json({ message: "Invite already exists" });
        return;
    }
    invite = await ChannelInvite_1.default.create({ invitedUser: invitedUser._id, channel: channelId, author: currentUserId });
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
const getChannel = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId, includeParticipants, includeInvites } = req.body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    const channel = await Channel_1.default.findById(channelId)
        .populate("DMUser", "name avatarImage level roles")
        .populate("createdBy", "name avatarImage level roles")
        .lean();
    if (!channel) {
        res.status(404).json({ message: "Channel not found" });
        return;
    }
    const data = {
        id: channel._id,
        title: channel._type == ChannelTypeEnum_1.default.GROUP ? channel.title : channel.DMUser?._id == currentUserId ? channel.createdBy.name : channel.DMUser?.name,
        coverImage: channel.DMUser?._id == currentUserId ? channel.createdBy.avatarImage : channel.DMUser?.avatarImage,
        type: channel._type,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        lastActiveAt: participant.lastActiveAt,
        unreadCount: participant.unreadCount,
        muted: participant.muted
    };
    if (includeInvites) {
        const invites = await ChannelInvite_1.default.find({ channel: channelId })
            .populate("author", "name avatarImage level roles")
            .populate("invitedUser", "name avatarImage level roles")
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
        const participants = await ChannelParticipant_1.default.find({ channel: channelId })
            .populate("user", "name avatarImage level roles") // Assumes user ref is populated
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
const getChannelsList = (0, express_async_handler_1.default)(async (req, res) => {
    const { fromDate, count } = req.body;
    const currentUserId = req.userId;
    // First find all channels where user is participant
    const participantChannels = await ChannelParticipant_1.default.find({ user: currentUserId })
        .select('channel lastActiveAt muted unreadCount');
    const channelIds = participantChannels.map(p => p.channel);
    let query = Channel_1.default.find({ _id: { $in: channelIds } });
    if (fromDate) {
        query = query.where({ updatedAt: { $lt: new Date(fromDate) } });
    }
    const channels = await query
        .sort({ updatedAt: -1 })
        .limit(count)
        .populate("DMUser", "name avatarImage level roles")
        .populate("createdBy", "name avatarImage level roles")
        .populate({
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
        channels: channels.map(x => {
            const lastActiveAt = participantChannels.find(y => y.channel.equals(x._id))?.lastActiveAt;
            return {
                id: x._id,
                type: x._type,
                title: x._type == ChannelTypeEnum_1.default.GROUP ? x.title : x.DMUser?._id == currentUserId ? x.createdBy.name : x.DMUser?.name,
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
                    viewed: lastActiveAt
                        ? lastActiveAt >= x.lastMessage.createdAt
                        : false
                } : null
            };
        })
    });
});
const getInvitesList = (0, express_async_handler_1.default)(async (req, res) => {
    const { fromDate, count } = req.body;
    const currentUserId = req.userId;
    let query = ChannelInvite_1.default.find({ invitedUser: currentUserId });
    if (fromDate) {
        query = query.where({ createdAt: { $lt: new Date(fromDate) } });
    }
    const invites = await query
        .sort({ createdAt: -1 })
        .limit(count)
        .populate("author", "name avatarImage level roles")
        .populate("channel", "title _type")
        .lean();
    const totalCount = await ChannelInvite_1.default.countDocuments({ invitedUser: currentUserId });
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
const acceptInvite = (0, express_async_handler_1.default)(async (req, res) => {
    const { inviteId, accepted } = req.body;
    const currentUserId = req.userId;
    const invite = await ChannelInvite_1.default.findById(inviteId);
    if (!invite) {
        res.status(403).json({ message: "Invite not found" });
        return;
    }
    if (!invite.invitedUser.equals(currentUserId)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    await invite.accept(accepted);
    if (accepted) {
        await ChannelMessage_1.default.create({
            _type: ChannelMessageTypeEnum_1.default.USER_JOINED,
            content: "{action_user} joined",
            channel: invite.channel,
            user: currentUserId
        });
    }
    res.json({ success: true, data: { accepted } });
});
const groupRemoveUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId, userId } = req.body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant || ![ChannelRolesEnum_1.default.OWNER, ChannelRolesEnum_1.default.ADMIN].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    const targetParticipant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: userId });
    if (!targetParticipant || targetParticipant.role == ChannelRolesEnum_1.default.OWNER || participant.role == targetParticipant.role) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    await targetParticipant.deleteOne();
    await ChannelMessage_1.default.create({
        _type: ChannelMessageTypeEnum_1.default.USER_LEFT,
        content: "{action_user} was removed",
        channel: channelId,
        user: userId
    });
    res.json({ success: true });
});
const leaveChannel = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId } = req.body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    const result = await ChannelParticipant_1.default.deleteOne({ user: currentUserId, channel: channelId });
    if (result.deletedCount === 1) {
        await ChannelMessage_1.default.create({
            _type: ChannelMessageTypeEnum_1.default.USER_LEFT,
            content: "{action_user} left",
            channel: channelId,
            user: currentUserId
        });
        res.json({ success: true });
    }
    else {
        res.json({ success: false });
    }
});
const createMessage = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId, content } = req.body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    const message = await ChannelMessage_1.default.create({
        _type: ChannelMessageTypeEnum_1.default.MESSAGE,
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
const getMessages = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId, count, fromDate } = req.body;
    const currentUserId = req.userId;
    if (typeof channelId === "undefined" || typeof count !== "number" || count < 1 || count > 100) {
        res.status(400).json({ message: "Invalid body" });
        return;
    }
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    let query = ChannelMessage_1.default.find({ channel: channelId });
    if (fromDate) {
        query = query.where({ createdAt: { $lt: new Date(fromDate) } });
    }
    const messages = await query
        .sort({ createdAt: -1 })
        .limit(count)
        .populate("user", "name avatarImage level roles")
        .lean();
    const data = messages.map(x => ({
        id: x._id,
        type: x._type,
        userId: x.user._id,
        userName: x.user.name,
        userAvatar: x.user.avatarImage,
        createdAt: x.createdAt,
        content: x.deleted ? "" : x.content,
        deleted: x.deleted,
        channelId: x.channel,
        viewed: participant.lastActiveAt ? participant.lastActiveAt >= x.createdAt : false,
        attachments: new Array()
    }));
    let promises = [];
    for (let i = 0; i < data.length; ++i) {
        if (data[i].deleted)
            continue;
        promises.push(PostAttachment_1.default.getByPostId({ channelMessage: data[i].id }).then(attachments => data[i].attachments = attachments));
    }
    await Promise.all(promises);
    res.json({
        messages: data
    });
});
const groupCancelInvite = (0, express_async_handler_1.default)(async (req, res) => {
    const { inviteId } = req.body;
    const currentUserId = req.userId;
    const invite = await ChannelInvite_1.default.findById(inviteId);
    if (!invite) {
        res.status(404).json({ message: "Invite not found" });
        return;
    }
    const participant = await ChannelParticipant_1.default.findOne({ channel: invite.channel, user: currentUserId });
    if (!participant || ![ChannelRolesEnum_1.default.OWNER, ChannelRolesEnum_1.default.ADMIN].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    await invite.deleteOne();
    const io = (0, socketServer_1.getIO)();
    if (io) {
        io.to((0, socketServer_1.uidRoom)(invite.invitedUser.toString())).emit("channels:invite_canceled", {
            inviteId
        });
    }
    res.json({
        success: true
    });
});
const groupRename = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId, title } = req.body;
    const currentUserId = req.userId;
    if (typeof title !== "string" || title.length < 3 || title.length > 20) {
        res.status(400).json({ message: "Title must be string of 3 - 20 characters" });
        return;
    }
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant || participant.role !== ChannelRolesEnum_1.default.OWNER) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    try {
        await Channel_1.default.updateOne({ _id: channelId }, { title });
        await ChannelMessage_1.default.create({
            _type: ChannelMessageTypeEnum_1.default.TITLE_CHANGED,
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
    }
    catch (err) {
        res.json({
            success: false,
            message: err?.message
        });
    }
});
const groupChangeRole = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId, channelId, role } = req.body;
    const currentUserId = req.userId;
    if (!Object.values(ChannelRolesEnum_1.default).includes(role)) {
        res.status(400).json({ message: "Invalid role" });
        return;
    }
    const currentParticipant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!currentParticipant || currentParticipant.role !== ChannelRolesEnum_1.default.OWNER) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    const targetParticipant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: userId });
    if (!targetParticipant) {
        res.status(404).json({ message: "Target user is not a participant" });
        return;
    }
    if (userId === currentUserId) {
        res.status(400).json({ message: "You cannot change your own role" });
        return;
    }
    if (role === ChannelRolesEnum_1.default.OWNER) {
        await ChannelParticipant_1.default.updateOne({ channel: channelId, user: currentUserId }, { role: ChannelRolesEnum_1.default.ADMIN });
    }
    targetParticipant.role = role;
    await targetParticipant.save();
    res.json({ success: true, data: { userId, role } });
});
const deleteChannel = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId } = req.body;
    const currentUserId = req.userId;
    const channel = await Channel_1.default.findById(channelId);
    if (!channel) {
        res.status(404).json({ message: "Channel not found" });
        return;
    }
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    if (channel._type !== ChannelTypeEnum_1.default.DM && ChannelRolesEnum_1.default.OWNER !== participant.role) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    const participants = await ChannelParticipant_1.default.find({ channel: channelId });
    await channel.deleteOne();
    const io = (0, socketServer_1.getIO)();
    if (io) {
        io.to(participants.map(x => (0, socketServer_1.uidRoom)(x.user.toString()))).emit("channels:channel_deleted", {
            channelId
        });
    }
    res.json({ success: true });
});
const getUnseenMessagesCount = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    // Count unseen messages
    const results = await ChannelParticipant_1.default.aggregate([
        {
            $match: {
                user: new mongoose_1.default.Types.ObjectId(currentUserId),
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
    // Count invites
    const invitesCount = await ChannelInvite_1.default.countDocuments({ invitedUser: currentUserId });
    // Sum up
    const totalCount = unseenMessagesCount + invitesCount;
    res.json({ count: totalCount });
});
const muteChannel = (0, express_async_handler_1.default)(async (req, res) => {
    const { channelId, muted } = req.body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
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
const markMessagesSeenWS = async (socket, payload) => {
    const { channelId } = payload;
    const currentUserId = socket.data.userId;
    try {
        const participant = await ChannelParticipant_1.default.findOne({ user: currentUserId, channel: channelId });
        if (!participant) {
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
    }
    catch (err) {
        console.log("Mark messages seen failed:", err.message);
    }
};
const createMessageWS = async (socket, payload) => {
    const { channelId, content } = payload;
    const currentUserId = socket.data.userId;
    try {
        const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
        if (!participant) {
            return;
        }
        await ChannelMessage_1.default.create({
            _type: ChannelMessageTypeEnum_1.default.MESSAGE,
            content,
            channel: channelId,
            user: currentUserId
        });
    }
    catch (err) {
        console.log("Message could not be created:", err.message);
    }
};
const deleteMessageWS = async (socket, payload) => {
    const { messageId } = payload;
    const currentUserId = socket.data.userId;
    try {
        const message = await ChannelMessage_1.default.findById(messageId);
        if (!message || message.user != currentUserId) {
            return;
        }
        message.deleted = true;
        await message.save();
    }
    catch (err) {
        console.log("Message could not be deleted:", err.message);
    }
};
const editMessageWS = async (socket, payload) => {
    const { messageId } = payload;
    const currentUserId = socket.data.userId;
    try {
        const message = await ChannelMessage_1.default.findById(messageId);
        if (!message || message.user != currentUserId) {
            return;
        }
        message.content = payload.content;
        await message.save();
    }
    catch (err) {
        console.log("Message could not be edited:", err.message);
    }
};
const registerHandlersWS = (socket) => {
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
};
exports.registerHandlersWS = registerHandlersWS;
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
    deleteChannel,
    muteChannel
};
exports.default = channelsController;
