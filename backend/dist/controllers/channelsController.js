"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Channel_1 = __importDefault(require("../models/Channel"));
const ChannelInvite_1 = __importDefault(require("../models/ChannelInvite"));
const ChannelParticipant_1 = __importDefault(require("../models/ChannelParticipant"));
const User_1 = __importDefault(require("../models/User"));
const ChannelMessage_1 = __importDefault(require("../models/ChannelMessage"));
const createGroup = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title } = req.body;
    const currentUserId = req.userId;
    const channel = yield Channel_1.default.create({ _type: 2, createdBy: currentUserId, title });
    yield ChannelParticipant_1.default.create({ channel: channel._id, user: currentUserId, role: "Owner" });
    res.json({
        channel: {
            id: channel._id,
            title: channel.title,
            updatedAt: channel.updatedAt
        }
    });
}));
const createDirectMessages = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    const currentUserId = req.userId;
    const DMUser = yield User_1.default.findById(userId, "name avatarImage level roles");
    if (!DMUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    let channel = yield Channel_1.default.where({ _type: 1, createdBy: { $in: [userId, currentUserId] }, DMUser: { $in: [userId, currentUserId] } }).findOne();
    if (!channel) {
        channel = yield Channel_1.default.create({ _type: 1, createdBy: currentUserId, DMUser: userId });
        yield ChannelParticipant_1.default.create({ channel: channel._id, user: currentUserId, role: "Member" });
        yield ChannelInvite_1.default.create({ channel: channel._id, author: channel.createdBy, invitedUser: channel.DMUser });
    }
    else {
        const myInvite = yield ChannelInvite_1.default.findOne({ channel: channel._id, invitedUser: currentUserId });
        if (myInvite) {
            yield myInvite.accept();
        }
    }
    res.json({
        channel: {
            id: channel._id
        }
    });
}));
const groupInviteUser = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { channelId, username } = req.body;
    const currentUserId = req.userId;
    const participant = yield ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant || !["Owner", "Admin"].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    const invitedUser = yield User_1.default.findOne({ name: username }, "_id name avatarImage");
    if (!invitedUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    if ((yield ChannelParticipant_1.default.findOne({ channel: channelId, user: invitedUser._id }, "_id")) != null) {
        res.status(400).json({ message: "Invited user is already participant" });
        return;
    }
    let invite = yield ChannelInvite_1.default.findOne({ invitedUser: invitedUser._id, channel: channelId });
    if (invite) {
        res.status(400).json({ message: "Invite already exists" });
        return;
    }
    invite = yield ChannelInvite_1.default.create({ invitedUser: invitedUser._id, channel: channelId, author: currentUserId });
    res.json({
        invite: {
            id: invite._id,
            invitedUserId: invitedUser._id,
            invitedUserName: invitedUser.name,
            invitedUserAvatar: invitedUser.avatarImage,
            createdAt: invite.createdAt
        }
    });
}));
const getChannel = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { channelId, includeParticipants, includeInvites } = req.body;
    const currentUserId = req.userId;
    const participant = yield ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    const channel = yield Channel_1.default.findById(channelId)
        .populate("DMUser", "name avatarImage level roles")
        .populate("createdBy", "name avatarImage level roles")
        .lean();
    if (!channel) {
        res.status(404).json({ message: "Channel not found" });
        return;
    }
    const data = {
        id: channel._id,
        title: channel._type == 2 ? channel.title : ((_a = channel.DMUser) === null || _a === void 0 ? void 0 : _a._id) == currentUserId ? channel.createdBy.name : (_b = channel.DMUser) === null || _b === void 0 ? void 0 : _b.name,
        coverImage: ((_c = channel.DMUser) === null || _c === void 0 ? void 0 : _c._id) == currentUserId ? channel.createdBy.avatarImage : (_d = channel.DMUser) === null || _d === void 0 ? void 0 : _d.avatarImage,
        type: channel._type,
        DMUser: channel.DMUser,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt
    };
    if (includeInvites) {
        const invites = yield ChannelInvite_1.default.find({ channel: channelId })
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
        const participants = yield ChannelParticipant_1.default.find({ channel: channelId })
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
}));
const getChannelsList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fromDate, count } = req.body;
    const currentUserId = req.userId;
    // First find all channels where user is participant
    const participantChannels = yield ChannelParticipant_1.default.find({ user: currentUserId }).select('channel');
    const channelIds = participantChannels.map(p => p.channel);
    let query = Channel_1.default.find({ _id: { $in: channelIds } });
    if (fromDate) {
        query = query.where({ updatedAt: { $lt: new Date(fromDate) } });
    }
    const channels = yield query
        .sort({ updatedAt: -1 })
        .limit(count)
        .populate("DMUser", "name avatarImage level roles")
        .populate("createdBy", "name avatarImage level roles")
        .populate({
        path: "lastMessage",
        select: "user content _type",
        populate: {
            path: "user",
            select: "name avatarImage"
        }
    })
        .lean();
    res.json({
        channels: channels.map(x => {
            var _a, _b, _c, _d;
            return ({
                id: x._id,
                type: x._type,
                title: x._type == 2 ? x.title : ((_a = x.DMUser) === null || _a === void 0 ? void 0 : _a._id) == currentUserId ? x.createdBy.name : (_b = x.DMUser) === null || _b === void 0 ? void 0 : _b.name,
                coverImage: ((_c = x.DMUser) === null || _c === void 0 ? void 0 : _c._id) == currentUserId ? x.createdBy.avatarImage : (_d = x.DMUser) === null || _d === void 0 ? void 0 : _d.avatarImage,
                createdAt: x.createdAt,
                updatedAt: x.updatedAt,
                lastMessage: x.lastMessage ? {
                    type: x.lastMessage._type,
                    id: x.lastMessage._id,
                    content: x.lastMessage.content,
                    createdAt: x.lastMessage.createdAt,
                    userId: x.lastMessage.user._id,
                    userName: x.lastMessage.user.name,
                    userAvatar: x.lastMessage.user.avatarImage
                } : null
            });
        })
    });
}));
const getInvitesList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fromDate, count } = req.body;
    const currentUserId = req.userId;
    let query = ChannelInvite_1.default.find({ invitedUser: currentUserId });
    if (fromDate) {
        query = query.where({ createdAt: { $lt: new Date(fromDate) } });
    }
    const invites = yield query
        .sort({ createdAt: -1 })
        .limit(count)
        .populate("author", "name avatarImage level roles")
        .populate("channel", "title _type")
        .lean();
    res.json({
        invites: invites.map(x => ({
            id: x._id,
            authorId: x.author._id,
            authorName: x.author.name,
            authorAvatar: x.author.avatarImage,
            channelId: x.channel.id,
            channelType: x.channel._type,
            channelTitle: x.channel.title,
            createdAt: x.createdAt
        }))
    });
}));
const acceptInvite = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { inviteId, accepted } = req.body;
    const currentUserId = req.userId;
    const invite = yield ChannelInvite_1.default.findById(inviteId);
    if (!invite) {
        res.status(403).json({ message: "Invite not found" });
        return;
    }
    if (!invite.invitedUser.equals(currentUserId)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    yield invite.accept(accepted);
    if (accepted) {
        yield ChannelMessage_1.default.create({
            _type: 2,
            content: "{action_user} joined",
            channel: invite.channel,
            user: currentUserId
        });
    }
    res.json({ success: true, data: { accepted } });
}));
const groupRemoveUser = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { channelId, userId } = req.body;
    const currentUserId = req.userId;
    const participant = yield ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant || !["Owner", "Admin"].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    const result = yield ChannelParticipant_1.default.deleteOne({ user: userId, channel: channelId });
    if (result.deletedCount === 1) {
        yield ChannelMessage_1.default.create({
            _type: 3,
            content: "{action_user} left",
            channel: channelId,
            user: userId
        });
        res.json({ success: true });
    }
    else {
        res.json({ success: false });
    }
}));
const leaveChannel = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { channelId } = req.body;
    const currentUserId = req.userId;
    const participant = yield ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    const result = yield ChannelParticipant_1.default.deleteOne({ user: currentUserId, channel: channelId });
    if (result.deletedCount === 1) {
        yield ChannelMessage_1.default.create({
            _type: 3,
            content: "{action_user} left",
            channel: channelId,
            user: currentUserId
        });
        res.json({ success: true });
    }
    else {
        res.json({ success: false });
    }
}));
const createMessage = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { channelId, content } = req.body;
    const currentUserId = req.userId;
    const participant = yield ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    const message = yield ChannelMessage_1.default.create({
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
}));
const getMessages = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { channelId, count, fromDate } = req.body;
    const currentUserId = req.userId;
    const participant = yield ChannelParticipant_1.default.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }
    let query = ChannelMessage_1.default.find({ channel: channelId });
    if (fromDate) {
        query = query.where({ createdAt: { $lt: new Date(fromDate) } });
    }
    const messages = yield query
        .sort({ createdAt: -1 })
        .limit(count)
        .populate("user", "name avatarImage level roles")
        .lean();
    res.json({
        messages: messages.map(x => ({
            id: x._id,
            type: x._type,
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            createdAt: x.createdAt,
            content: x.content,
            channelId: x.channel
        }))
    });
}));
const groupRevokeInvite = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { inviteId } = req.body;
    const currentUserId = req.userId;
    const invite = yield ChannelInvite_1.default.findById(inviteId);
    if (!invite) {
        res.status(404).json({ message: "Invite not found" });
        return;
    }
    const participant = yield ChannelParticipant_1.default.findOne({ channel: invite.channel, user: currentUserId });
    if (!participant || !["Owner", "Admin"].includes(participant.role)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }
    yield invite.deleteOne();
    res.json({
        success: true
    });
}));
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
    groupRevokeInvite
};
exports.default = channelsController;
