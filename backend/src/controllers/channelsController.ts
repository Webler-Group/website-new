import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import Channel from "../models/Channel";
import ChannelInvite from "../models/ChannelInvite";
import ChannelParticipant from "../models/ChannelParticipant";
import User from "../models/User";
import { SchemaTypes } from "mongoose";
import ChannelMessage from "../models/ChannelMessage";

const createGroup = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { title } = req.body;
    const currentUserId = req.userId;

    const channel = await Channel.create({ _type: 2, createdBy: currentUserId, title });

    await ChannelParticipant.create({ channel: channel._id, user: currentUserId, role: "Owner" });

    res.json({
        channel: {
            id: channel._id,
            title: channel.title
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
            channelId: channel._id,
            DMUser
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

    const invitedUser = await User.findOne({ name: username }, "_id");
    if (!invitedUser) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    if ((await ChannelParticipant.findOne({ channel: channelId, user: invitedUser._id }, "_id")) != null) {
        res.status(400).json({ message: "Invited user is already participant" });
        return;
    }

    let invite = await ChannelInvite.findOne({ invitedUser: invitedUser._id, channel: channelId, author: currentUserId });
    if (invite) {
        res.status(400).json({ message: "Invite already exists" });
        return;
    }

    invite = await ChannelInvite.create({ invitedUser: invitedUser._id, channel: channelId, author: currentUserId });

    res.json({
        invite: {
            id: invite._id
        }
    });
});

const getChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { channelId } = req.body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipant.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        res.status(403).json({ message: "Not a member of this channel" });
        return;
    }

    const channel = await Channel.findById(channelId).lean();
    if (!channel) {
        res.status(404).json({ message: "Channel not found" });
        return;
    }

    const invites = await ChannelInvite.find({ channel: channelId })
        .populate<{ author: any }>("author", "name avatarImage level roles")
        .populate<{ invitedUser: any }>("invitedUser", "name avatarImage level roles")
        .lean();

    const participants = await ChannelParticipant.find({ channel: channelId })
        .populate("user", "name avatarImage level roles") // Assumes user ref is populated
        .lean();

    res.json({
        channel: {
            id: channel._id,
            title: channel.title,
            type: channel._type,
            participants: participants.map((x: any) => ({
                userId: x.user._id,
                userName: x.user.name,
                userAvatar: x.user.avatarImage,
                role: x.role
            })),
            invites: invites.map(x => ({
                id: x._id,
                authorId: x.author._id,
                authorName: x.author.name,
                authorAvatar: x.author.avatarImage,
                invitedUserId: x.invitedUser._id,
                invitedUserName: x.invitedUser.name,
                invitedUserAvatar: x.invitedUser.avatarImage
            }))
        }
    });
});

const getChannelsList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { page = 1, count = 20 } = req.body;
    const currentUserId = req.userId;
    const skip = (page - 1) * count;

    // First find all channels where user is participant
    const participantChannels = await ChannelParticipant.find({ user: currentUserId }).select('channel');
    const channelIds = participantChannels.map(p => p.channel);

    const channels = await Channel.find({ _id: { $in: channelIds } })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(count)
        .populate<{ DMUser: any }>("DMUser", "name avatarImage level roles")
        .lean();

    res.json({
        channels: channels.map(x => ({
            id: x._id,
            type: x._type,
            title: x.title,
            DMUser: x.DMUser
        }))
    });
});

const getInvitesList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { page = 1, count = 20 } = req.body;
    const currentUserId = req.userId;
    const skip = (page - 1) * count;

    const invites = await ChannelInvite.find({ invitedUser: currentUserId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(count)
        .populate<{ author: any }>("author", "name avatarImage level roles")
        .populate<{ channel: any }>("channel", "title _type")
        .lean();

    res.json({
        invites: invites.map(x => ({
            id: x._id,
            authorId: x.author._id,
            authorName: x.author.name,
            authorAvatar: x.author.avatarImage,
            channelId: x.channel.id,
            channelType: x.channel._type,
            channelTitle: x.channel.title
        }))
    });
});

const acceptInvite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { inviteId, accepted } = req.body;
    const currentUserId = req.userId;

    const invite = await ChannelInvite.findById(inviteId);
    
    if (!invite || !invite.invitedUser.equals(currentUserId!)) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    invite.accept(accepted);

    res.json({ success: true, data: { accepted } });
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
        content,
        channel: channelId,
        user: currentUserId
    });

    res.json({
        message: {
            id: message._id,
            createdAt: message.createdAt
        }
    });
});

const getMessages = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { } = req.body;
});

const channelsController = {
    createGroup,
    createDirectMessages,
    groupInviteUser,
    getChannel,
    getChannelsList,
    acceptInvite,
    getInvitesList,
    createMessage,
    getMessages
}

export default channelsController;