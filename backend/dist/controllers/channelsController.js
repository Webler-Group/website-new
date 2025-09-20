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
const StringUtils_1 = require("../utils/StringUtils");
const channelsSchema_1 = require("../validation/channelsSchema");
const zodUtils_1 = require("../utils/zodUtils");
const zod_1 = __importDefault(require("zod"));
const createGroup = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.createGroupSchema, req);
    const { title } = body;
    const currentUserId = req.userId;
    const channel = await Channel_1.default.create({ _type: ChannelTypeEnum_1.default.GROUP, createdBy: currentUserId, title });
    await ChannelParticipant_1.default.create({ channel: channel._id, user: currentUserId, role: ChannelRolesEnum_1.default.OWNER });
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
const createDirectMessages = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.createDirectMessagesSchema, req);
    const { userId } = body;
    const currentUserId = req.userId;
    const DMUser = await User_1.default.findById(userId, "name avatarImage level roles");
    if (!DMUser) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }
    let channel = await Channel_1.default.where({
        _type: ChannelTypeEnum_1.default.DM,
        createdBy: { $in: [userId, currentUserId] },
        DMUser: { $in: [userId, currentUserId] }
    }).findOne();
    if (!channel) {
        channel = await Channel_1.default.create({ _type: ChannelTypeEnum_1.default.DM, createdBy: currentUserId, DMUser: userId });
        await ChannelParticipant_1.default.create({ channel: channel._id, user: currentUserId, role: ChannelRolesEnum_1.default.MEMBER });
    }
    else {
        const myInvite = await ChannelInvite_1.default.findOne({ channel: channel._id, invitedUser: currentUserId });
        if (myInvite) {
            await myInvite.accept();
        }
        else {
            await Channel_1.default.join(channel._id, new mongoose_1.default.Types.ObjectId(currentUserId));
        }
    }
    res.json({
        success: true,
        channel: {
            id: channel._id
        }
    });
});
const groupInviteUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.groupInviteUserSchema, req);
    const { channelId, userId } = body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant || ![ChannelRolesEnum_1.default.OWNER, ChannelRolesEnum_1.default.ADMIN].includes(participant.role)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    const invitedUser = await User_1.default.findById(userId, "name avatarImage roles level");
    if (!invitedUser) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }
    if (await ChannelParticipant_1.default.findOne({ channel: channelId, user: invitedUser._id }, "_id")) {
        res.status(400).json({ error: [{ message: "Invited user is already a participant" }] });
        return;
    }
    const existingInvite = await ChannelInvite_1.default.findOne({ invitedUser: invitedUser._id, channel: channelId });
    if (existingInvite) {
        res.status(400).json({ error: [{ message: "Invite already exists" }] });
        return;
    }
    const invite = await ChannelInvite_1.default.create({ invitedUser: invitedUser._id, channel: channelId, author: currentUserId });
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
const getChannel = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.getChannelSchema, req);
    const { channelId, includeParticipants, includeInvites } = body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
        return;
    }
    const channel = await Channel_1.default.findById(channelId)
        .populate("DMUser", "name avatarImage level roles")
        .populate("createdBy", "name avatarImage level roles")
        .lean();
    if (!channel) {
        res.status(404).json({ error: [{ message: "Channel not found" }] });
        return;
    }
    const data = {
        id: channel._id,
        title: channel._type === ChannelTypeEnum_1.default.GROUP ? channel.title : channel.DMUser?._id == currentUserId ? channel.createdBy.name : channel.DMUser?.name,
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
            .populate("user", "name avatarImage level roles")
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
const getChannelsList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.getChannelsListSchema, req);
    const { fromDate, count } = body;
    const currentUserId = req.userId;
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
        success: true,
        channels: channels.map(x => {
            const lastActiveAt = participantChannels.find(y => y.channel.equals(x._id))?.lastActiveAt;
            return {
                id: x._id,
                type: x._type,
                title: x._type === ChannelTypeEnum_1.default.GROUP ? x.title : x.DMUser?._id == currentUserId ? x.createdBy.name : x.DMUser?.name,
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
            };
        })
    });
});
const getInvitesList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.getInvitesListSchema, req);
    const { fromDate, count } = body;
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
const acceptInvite = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.acceptInviteSchema, req);
    const { inviteId, accepted } = body;
    const currentUserId = req.userId;
    const invite = await ChannelInvite_1.default.findById(inviteId);
    if (!invite) {
        res.status(404).json({ error: [{ message: "Invite not found" }] });
        return;
    }
    if (!invite.invitedUser.equals(currentUserId)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    await invite.accept(accepted);
    res.json({ success: true, data: { accepted } });
});
const groupRemoveUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.groupRemoveUserSchema, req);
    const { channelId, userId } = body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant || ![ChannelRolesEnum_1.default.OWNER, ChannelRolesEnum_1.default.ADMIN].includes(participant.role)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    const targetParticipant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: userId });
    if (!targetParticipant || targetParticipant.role === ChannelRolesEnum_1.default.OWNER || participant.role === targetParticipant.role) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
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
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.leaveChannelSchema, req);
    const { channelId } = body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
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
    }
    res.json({ success: true });
});
const getMessages = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.getMessagesSchema, req);
    const { channelId, count, fromDate } = body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
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
        .populate({
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
            content: x.repliedTo.deleted ? "" : (0, StringUtils_1.truncate)(x.repliedTo.content, 50),
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
    const promises = data.map((item, i) => item.deleted ? Promise.resolve() :
        PostAttachment_1.default.getByPostId({ channelMessage: item.id }).then(attachments => {
            data[i].attachments = attachments;
        }));
    await Promise.all(promises);
    res.json({
        success: true,
        messages: data
    });
});
const groupCancelInvite = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.groupCancelInviteSchema, req);
    const { inviteId } = body;
    const currentUserId = req.userId;
    const invite = await ChannelInvite_1.default.findById(inviteId);
    if (!invite) {
        res.status(404).json({ error: [{ message: "Invite not found" }] });
        return;
    }
    const participant = await ChannelParticipant_1.default.findOne({ channel: invite.channel, user: currentUserId });
    if (!participant || ![ChannelRolesEnum_1.default.OWNER, ChannelRolesEnum_1.default.ADMIN].includes(participant.role)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    await invite.deleteOne();
    const io = (0, socketServer_1.getIO)();
    if (io) {
        io.to((0, socketServer_1.uidRoom)(invite.invitedUser.toString())).emit("channels:invite_canceled", {
            inviteId
        });
    }
    res.json({ success: true });
});
const groupRename = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.groupRenameSchema, req);
    const { channelId, title } = body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant || participant.role !== ChannelRolesEnum_1.default.OWNER) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    await Channel_1.default.updateOne({ _id: channelId }, { title });
    await ChannelMessage_1.default.create({
        _type: ChannelMessageTypeEnum_1.default.TITLE_CHANGED,
        content: "{action_user} renamed the group to " + title,
        channel: channelId,
        user: currentUserId
    });
    res.json({
        success: true,
        data: { title }
    });
});
const groupChangeRole = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.groupChangeRoleSchema, req);
    const { userId, channelId, role } = body;
    const currentUserId = req.userId;
    const currentParticipant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!currentParticipant || currentParticipant.role !== ChannelRolesEnum_1.default.OWNER) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    const targetParticipant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: userId });
    if (!targetParticipant) {
        res.status(404).json({ error: [{ message: "Target user is not a participant" }] });
        return;
    }
    if (userId === currentUserId) {
        res.status(400).json({ error: [{ message: "You cannot change your own role" }] });
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
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.deleteChannelSchema, req);
    const { channelId } = body;
    const currentUserId = req.userId;
    const channel = await Channel_1.default.findById(channelId);
    if (!channel) {
        res.status(404).json({ error: [{ message: "Channel not found" }] });
        return;
    }
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ error: [{ message: "Not a member of this channel" }] });
        return;
    }
    if (channel._type !== ChannelTypeEnum_1.default.DM && participant.role !== ChannelRolesEnum_1.default.OWNER) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
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
    const invitesCount = await ChannelInvite_1.default.countDocuments({ invitedUser: currentUserId });
    const totalCount = unseenMessagesCount + invitesCount;
    res.json({ success: true, count: totalCount });
});
const muteChannel = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(channelsSchema_1.muteChannelSchema, req);
    const { channelId, muted } = body;
    const currentUserId = req.userId;
    const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
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
const markMessagesSeenWS = async (socket, payload) => {
    try {
        const { channelId } = channelsSchema_1.markMessagesSeenWSSchema.parse(payload);
        const currentUserId = socket.data.userId;
        const participant = await ChannelParticipant_1.default.findOne({ user: currentUserId, channel: channelId });
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
    }
    catch (err) {
        if (err instanceof zod_1.default.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        }
        else {
            console.log("Mark messages seen failed:", err.message);
        }
    }
};
const createMessageWS = async (socket, payload) => {
    try {
        const { channelId, content, repliedTo } = channelsSchema_1.createMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;
        const participant = await ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
        if (!participant) {
            socket.emit("channels:error", { error: [{ message: "Not a member of this channel" }] });
            return;
        }
        const newMessage = await ChannelMessage_1.default.create({
            _type: ChannelMessageTypeEnum_1.default.MESSAGE,
            content,
            channel: channelId,
            repliedTo,
            user: currentUserId
        });
        const channel = await Channel_1.default.findById(newMessage.channel).select("_type createdBy DMUser").lean();
        if (channel && channel._type === ChannelTypeEnum_1.default.DM) {
            const messages = await ChannelMessage_1.default.find({ channel: channel._id }).limit(2).lean();
            if (messages.length === 1) {
                const exists = await ChannelParticipant_1.default.exists({ channel: channel._id, user: channel.DMUser });
                if (!exists) {
                    await ChannelInvite_1.default.create({ channel: channel._id, author: channel.createdBy, invitedUser: channel.DMUser });
                }
            }
        }
    }
    catch (err) {
        if (err instanceof zod_1.default.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        }
        else {
            console.log("Message could not be created:", err.message);
        }
    }
};
const deleteMessageWS = async (socket, payload) => {
    try {
        const { messageId } = channelsSchema_1.deleteMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;
        const message = await ChannelMessage_1.default.findById(messageId);
        if (!message || message.user != currentUserId) {
            socket.emit("channels:error", { error: [{ message: "Message not found or unauthorized" }] });
            return;
        }
        message.deleted = true;
        await message.save();
    }
    catch (err) {
        if (err instanceof zod_1.default.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        }
        else {
            console.log("Message could not be deleted:", err.message);
        }
    }
};
const editMessageWS = async (socket, payload) => {
    try {
        const { messageId, content } = channelsSchema_1.editMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;
        const message = await ChannelMessage_1.default.findById(messageId);
        if (!message || message.user != currentUserId) {
            socket.emit("channels:error", { error: [{ message: "Message not found or unauthorized" }] });
            return;
        }
        message.content = content;
        await message.save();
    }
    catch (err) {
        if (err instanceof zod_1.default.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        }
        else {
            console.log("Message could not be edited:", err.message);
        }
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
