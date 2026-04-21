import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import ChannelModel, { Channel } from "../models/Channel";
import ChannelInviteModel from "../models/ChannelInvite";
import ChannelParticipantModel from "../models/ChannelParticipant";
import UserModel, { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import ChannelMessageModel, { ChannelMessage } from "../models/ChannelMessage";
import { Socket } from "socket.io";
import mongoose, { Types } from "mongoose";
import ChannelRolesEnum from "../data/ChannelRolesEnum";
import ChannelTypeEnum from "../data/ChannelTypeEnum";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";
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
import RolesEnum from "../data/RolesEnum";
import { getImageUrl } from "./mediaController";
import { deleteChannelAndCleanup, formatChannelBase, inviteToChannel, joinChannel, processChannelInvite, saveChannelMessage } from "../helpers/channelsHelper";
import { getAttachmentsByPostId, PostAttachmentDetails } from "../helpers/postsHelper";
import { formatUserMinimal } from "../helpers/userHelper";
import { withTransaction } from "../utils/transaction";
import HttpError from "../exceptions/HttpError";
import { isBlocked } from "../helpers/userHelper";

interface ChannelResponse {
    id: Types.ObjectId;
    title?: string;
    coverImageUrl: string | null;
    type: ChannelTypeEnum;
    createdAt: Date;
    updatedAt: Date;
    lastActiveAt: Date | null;
    unreadCount: number;
    muted: boolean;
    active: boolean;
    invites?: {
        id: Types.ObjectId;
        author: ReturnType<typeof formatUserMinimal>;
        invitedUser: ReturnType<typeof formatUserMinimal>;
    }[];
    participants?: {
        role: ChannelRolesEnum;
        user: ReturnType<typeof formatUserMinimal>;
    }[];
}

const createGroup = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createGroupSchema, req);
    const { title } = body;
    const currentUserId = req.userId;

    const channel = await withTransaction(async (session) => {
        const [channel] = await ChannelModel.create(
            [{ _type: ChannelTypeEnum.GROUP, createdBy: currentUserId, title }],
            { session }
        );
        await ChannelParticipantModel.create(
            [{ channel: channel._id, user: currentUserId, role: ChannelRolesEnum.OWNER }],
            { session }
        );
        return channel;
    });

    res.json({
        success: true,
        data: {
            channel: {
                id: channel._id,
                type: channel._type,
                title: channel.title,
                createdAt: channel.createdAt,
                updatedAt: channel.updatedAt
            }
        }
    });
});

const createDirectMessages = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createDirectMessagesSchema, req);
    const { userId } = body;
    const currentUserId = req.userId!;

    const DMUser = await UserModel.findById(userId, USER_MINIMAL_FIELDS).lean();
    if (!DMUser || !DMUser.roles.includes(RolesEnum.USER)) {
        throw new HttpError("User not found", 404);
    }

    if (await isBlocked(currentUserId, userId)) {
        throw new HttpError("You cannot message this user", 403);
    }

    let channel = await ChannelModel.findOne().where({
        _type: ChannelTypeEnum.DM,
        createdBy: { $in: [userId, currentUserId] },
        DMUser: { $in: [userId, currentUserId] }
    }).lean();

    if (!channel) {
        channel = await withTransaction(async (session) => {
            const [newChannel] = await ChannelModel.create(
                [{ _type: ChannelTypeEnum.DM, createdBy: currentUserId, DMUser: userId }],
                { session }
            );
            await ChannelParticipantModel.create(
                [{ channel: newChannel._id, user: currentUserId, role: ChannelRolesEnum.MEMBER }],
                { session }
            );
            return newChannel;
        });
    } else {
        const myInvite = await ChannelInviteModel.findOne({ channel: channel._id, invitedUser: currentUserId }).lean();
        if (myInvite) {
            await processChannelInvite(myInvite, true);
        } else {
            await joinChannel(channel._id, new mongoose.Types.ObjectId(currentUserId));
        }
    }

    res.json({ success: true, data: { channel: { id: channel._id } } });
});

const groupInviteUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupInviteUserSchema, req);
    const { channelId, userId } = body;
    const currentUserId = req.userId!;

    const participant = await ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean();
    if (!participant || ![ChannelRolesEnum.OWNER, ChannelRolesEnum.ADMIN].includes(participant.role)) {
        throw new HttpError("Unauthorized", 403);
    }

    const invitedUser = await UserModel.findById(userId, USER_MINIMAL_FIELDS).lean();
    if (!invitedUser || !invitedUser.roles.includes(RolesEnum.USER)) {
        throw new HttpError("User not found", 404);
    }

    if (await isBlocked(currentUserId, userId)) {
        throw new HttpError("You cannot invite this user", 403);
    }

    const [alreadyParticipant, existingInvite] = await Promise.all([
        ChannelParticipantModel.exists({ channel: channelId, user: invitedUser._id }),
        ChannelInviteModel.exists({ invitedUser: invitedUser._id, channel: channelId })
    ]);

    if (alreadyParticipant) {
        throw new HttpError("Invited user is already a participant", 400);
    }
    if (existingInvite) {
        throw new HttpError("Invite already exists", 400);
    }

    const invite = await inviteToChannel(currentUserId!, invitedUser._id, channelId);

    res.json({
        success: true,
        data: {
            invite: {
                id: invite._id,
                invitedUser: formatUserMinimal(invitedUser),
                createdAt: invite.createdAt
            }
        }
    });
});

const getChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChannelSchema, req);
    const { channelId, includeParticipants, includeInvites } = body;
    const currentUserId = req.userId!;

    const [participant, channel] = await Promise.all([
        ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean(),
        ChannelModel.findById(channelId)
            .populate<{ DMUser: UserMinimal | null }>("DMUser", USER_MINIMAL_FIELDS)
            .populate<{ createdBy: UserMinimal }>("createdBy", USER_MINIMAL_FIELDS)
            .lean()
    ]);

    if (!participant) {
        throw new HttpError("Not a member of this channel", 403);
    }
    if (!channel) {
        throw new HttpError("Channel not found", 404);
    }

    let active = true;
    if (channel._type === ChannelTypeEnum.DM) {
        const DMUser = channel.DMUser!;
        const blocked = await isBlocked(channel.createdBy._id, DMUser._id);
        active = !blocked && (DMUser._id.equals(currentUserId) ? channel.createdBy.active : DMUser.active);
    }

    const data: ChannelResponse = {
        id: channel._id,
        title: channel._type === ChannelTypeEnum.GROUP ?
            channel.title :
            channel.DMUser?._id.equals(currentUserId) ? channel.createdBy.name : channel.DMUser?.name,
        coverImageUrl: getImageUrl(
            channel.DMUser?._id.equals(currentUserId) ? channel.createdBy.avatarHash : channel.DMUser?.avatarHash
        ),
        type: channel._type,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
        lastActiveAt: participant.lastActiveAt,
        unreadCount: participant.unreadCount,
        muted: participant.muted,
        active
    };

    if (includeInvites || includeParticipants) {
        const [invites, participants] = await Promise.all([
            includeInvites
                ? ChannelInviteModel.find({ channel: channelId })
                    .populate<{ author: UserMinimal }>("author", USER_MINIMAL_FIELDS)
                    .populate<{ invitedUser: UserMinimal }>("invitedUser", USER_MINIMAL_FIELDS)
                    .lean()
                : Promise.resolve(null),
            includeParticipants
                ? ChannelParticipantModel.find({ channel: channelId })
                    .populate<{ user: UserMinimal }>("user", USER_MINIMAL_FIELDS)
                    .lean()
                : Promise.resolve(null)
        ]);

        if (invites) {
            data.invites = invites.map(x => ({
                id: x._id,
                author: formatUserMinimal(x.author),
                invitedUser: formatUserMinimal(x.invitedUser)
            }));
        }
        if (participants) {
            data.participants = participants.map(x => ({
                user: formatUserMinimal(x.user),
                role: x.role
            }));
        }
    }

    res.json({ success: true, data: { channel: data } });
});

const getChannelsList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChannelsListSchema, req);
    const { fromDate, count } = body;
    const currentUserId = req.userId;

    const participantChannels = await ChannelParticipantModel.find({ user: currentUserId }).lean();

    const channelIds = participantChannels.map(p => p.channel);

    let query = ChannelModel.find({ _id: { $in: channelIds } });
    if (fromDate) {
        query = query.where({ updatedAt: { $lt: new Date(fromDate) } });
    }

    const channels = await query
        .sort({ updatedAt: -1 })
        .limit(count)
        .populate<{ DMUser: UserMinimal | null }>("DMUser", USER_MINIMAL_FIELDS)
        .populate<{ createdBy: UserMinimal }>("createdBy", USER_MINIMAL_FIELDS)
        .populate<{ lastMessage: ChannelMessage & { _id: Types.ObjectId; user: UserMinimal } | null }>({
            path: "lastMessage",
            populate: { path: "user", select: USER_MINIMAL_FIELDS }
        })
        .lean();

    res.json({
        success: true,
        data: {
            channels: channels.map(x => {
                const participant = participantChannels.find(y => y.channel.equals(x._id));
                return {
                    id: x._id,
                    type: x._type,
                    title: x._type === ChannelTypeEnum.GROUP
                        ? x.title
                        : x.DMUser?._id.equals(currentUserId) ? x.createdBy.name : x.DMUser?.name,
                    coverImageUrl: getImageUrl(
                        x.DMUser?._id.equals(currentUserId) ? x.createdBy.avatarHash : x.DMUser?.avatarHash
                    ),
                    createdAt: x.createdAt,
                    updatedAt: x.updatedAt,
                    unreadCount: participant?.unreadCount ?? 0,
                    muted: participant?.muted ?? false,
                    lastMessage: x.lastMessage ? {
                        type: x.lastMessage._type,
                        id: x.lastMessage._id,
                        deleted: x.lastMessage.deleted,
                        content: x.lastMessage.deleted ? "" : x.lastMessage.content,
                        createdAt: x.lastMessage.createdAt,
                        updatedAt: x.lastMessage.updatedAt,
                        user: formatUserMinimal(x.lastMessage.user),
                        viewed: participant?.lastActiveAt ? participant.lastActiveAt >= x.lastMessage.createdAt! : false
                    } : null
                };
            })
        }
    });
});

const getInvitesList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getInvitesListSchema, req);
    const { fromDate, count } = body;
    const currentUserId = req.userId;

    let query = ChannelInviteModel.find({ invitedUser: currentUserId });
    if (fromDate) {
        query = query.where({ createdAt: { $lt: new Date(fromDate) } });
    }

    const [invites, totalCount] = await Promise.all([
        query
            .sort({ createdAt: -1 })
            .limit(count)
            .populate<{ author: (UserMinimal) | null }>({ path: "author", select: USER_MINIMAL_FIELDS, match: { active: true } })
            .populate<{ channel: Channel & { _id: Types.ObjectId } }>("channel")
            .lean(),
        ChannelInviteModel.aggregate<{ total: number }>([
            { $match: { invitedUser: new mongoose.Types.ObjectId(currentUserId!) } },
            { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "authorData" } },
            { $match: { "authorData.active": true } },
            { $count: "total" }
        ]).then(r => r[0]?.total ?? 0)
    ]);

    const filteredInvites = invites.filter(x => x.author !== null);

    res.json({
        success: true,
        data: {
            invites: filteredInvites.map(x => ({
                id: x._id,
                author: formatUserMinimal(x.author!),
                createdAt: x.createdAt,
                channel: formatChannelBase(x.channel)
            })),
            count: totalCount
        }
    });
});

const acceptInvite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(acceptInviteSchema, req);
    const { inviteId, accepted } = body;
    const currentUserId = req.userId;

    const invite = await ChannelInviteModel.findById(inviteId).lean();
    if (!invite) {
        throw new HttpError("Invite not found", 404);
    }

    if (!invite.invitedUser.equals(currentUserId!)) {
        throw new HttpError("Unauthorized", 403);
    }

    await processChannelInvite(invite, accepted);

    res.json({ success: true, data: { accepted } });
});

const groupRemoveUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupRemoveUserSchema, req);
    const { channelId, userId } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean();
    if (!participant || ![ChannelRolesEnum.OWNER, ChannelRolesEnum.ADMIN].includes(participant.role)) {
        throw new HttpError("Unauthorized", 403);
    }

    const targetParticipant = await ChannelParticipantModel.findOne({ channel: channelId, user: userId }).lean();
    if (!targetParticipant || targetParticipant.role === ChannelRolesEnum.OWNER || participant.role === targetParticipant.role) {
        throw new HttpError("Unauthorized", 403);
    }

    await withTransaction(async (session) => {
        await ChannelParticipantModel.deleteOne({ _id: targetParticipant._id }, { session });

        const leaveMessage = new ChannelMessageModel({
            _type: ChannelMessageTypeEnum.USER_LEFT,
            content: "{action_user} was removed",
            channel: channelId,
            user: userId
        });
        await saveChannelMessage(leaveMessage, session);
    });

    res.json({ success: true });
});

const leaveChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(leaveChannelSchema, req);
    const { channelId } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean();
    if (!participant) {
        throw new HttpError("Not a member of this channel", 403);
    }

    await withTransaction(async (session) => {
        await ChannelParticipantModel.deleteOne({ _id: participant._id }, { session });

        const leaveMessage = new ChannelMessageModel({
            _type: ChannelMessageTypeEnum.USER_LEFT,
            content: "{action_user} left",
            channel: channelId,
            user: currentUserId
        });
        await saveChannelMessage(leaveMessage, session);
    });

    res.json({ success: true });
});

const getMessages = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getMessagesSchema, req);
    const { channelId, count, fromDate } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean();
    if (!participant) {
        throw new HttpError("Not a member of this channel", 403);
    }

    let query = ChannelMessageModel.find({ channel: channelId });
    if (fromDate) {
        query = query.where({ createdAt: { $lt: new Date(fromDate) } });
    }

    const messages = await query
        .sort({ createdAt: -1 })
        .limit(count)
        .populate<{ user: UserMinimal }>("user", USER_MINIMAL_FIELDS)
        .populate<{ repliedTo: ChannelMessage & { _id: Types.ObjectId; user: UserMinimal } }>({
            path: "repliedTo",
            populate: { path: "user", select: USER_MINIMAL_FIELDS }
        })
        .lean();

    const data = messages.map(x => ({
        id: x._id,
        type: x._type,
        user: formatUserMinimal(x.user),
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
        content: x.deleted ? "" : x.content,
        deleted: x.deleted,
        repliedTo: x.repliedTo ? {
            id: x.repliedTo._id,
            type: x.repliedTo._type,
            content: x.repliedTo.deleted ? "" : x.repliedTo.content,
            createdAt: x.repliedTo.createdAt,
            updatedAt: x.repliedTo.updatedAt,
            user: formatUserMinimal(x.repliedTo.user),
            deleted: x.repliedTo.deleted
        } : null,
        channelId: x.channel,
        viewed: participant.lastActiveAt ? participant.lastActiveAt >= x.createdAt! : false,
        attachments: [] as PostAttachmentDetails[]
    }));

    await Promise.all(data.map((item, i) =>
        item.deleted
            ? Promise.resolve()
            : getAttachmentsByPostId({ channelMessage: item.id }).then(attachments => { data[i].attachments = attachments; })
    ));

    res.json({ success: true, data: { messages: data } });
});

const groupCancelInvite = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupCancelInviteSchema, req);
    const { inviteId } = body;
    const currentUserId = req.userId;

    const invite = await ChannelInviteModel.findById(inviteId).lean();
    if (!invite) {
        throw new HttpError("Invite not found", 404);
    }

    const participant = await ChannelParticipantModel.findOne({ channel: invite.channel, user: currentUserId }).lean();
    if (!participant || ![ChannelRolesEnum.OWNER, ChannelRolesEnum.ADMIN].includes(participant.role)) {
        throw new HttpError("Unauthorized", 403);
    }

    await processChannelInvite(invite, false);

    res.json({ success: true });
});

const groupRename = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupRenameSchema, req);
    const { channelId, title } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean();
    if (!participant || participant.role !== ChannelRolesEnum.OWNER) {
        throw new HttpError("Unauthorized", 403);
    }

    await withTransaction(async (session) => {
        await ChannelModel.updateOne({ _id: channelId }, { title }, { session });

        const titleChangeMessage = new ChannelMessageModel({
            _type: ChannelMessageTypeEnum.TITLE_CHANGED,
            content: "{action_user} renamed the group to " + title,
            channel: channelId,
            user: currentUserId
        });
        await saveChannelMessage(titleChangeMessage, session);
    });

    res.json({ success: true, data: { title } });
});

const groupChangeRole = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(groupChangeRoleSchema, req);
    const { userId, channelId, role } = body;
    const currentUserId = req.userId;

    const currentParticipant = await ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean();
    if (!currentParticipant || currentParticipant.role !== ChannelRolesEnum.OWNER) {
        throw new HttpError("Unauthorized", 403);
    }

    if (userId === currentUserId) {
        throw new HttpError("You cannot change your own role", 400);
    }

    const result = await withTransaction(async (session) => {
        const targetParticipant = await ChannelParticipantModel.findOne({ channel: channelId, user: userId }).session(session);
        if (!targetParticipant) throw new HttpError("Target user is not a participant", 404);

        if (role === ChannelRolesEnum.OWNER) {
            await ChannelParticipantModel.updateOne(
                { channel: channelId, user: currentUserId },
                { role: ChannelRolesEnum.ADMIN },
                { session }
            );
        }

        targetParticipant.role = role;
        await targetParticipant.save({ session });

        return { userId, role };
    });

    res.json({ success: true, data: result });
});

const deleteChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteChannelSchema, req);
    const { channelId } = body;
    const currentUserId = req.userId;

    const [channel, participant] = await Promise.all([
        ChannelModel.findById(channelId).lean(),
        ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean()
    ]);

    if (!channel) {
        throw new HttpError("Channel not found", 404);
    }
    if (!participant) {
        throw new HttpError("Not a member of this channel", 403);
    }
    if (channel._type !== ChannelTypeEnum.DM && participant.role !== ChannelRolesEnum.OWNER) {
        throw new HttpError("Unauthorized", 403);
    }

    await withTransaction(async (session) => {
        await deleteChannelAndCleanup(channel._id, session);
    });

    res.json({ success: true });
});

const getUnseenMessagesCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const user = await UserModel.findById(currentUserId, { emailVerified: 1 }).lean();
    if (user?.emailVerified === false) {
        res.json({ success: true, data: { count: 0, channelIds: [] } });
        return;
    }

    const [unseenParticipants, invites] = await Promise.all([
        ChannelParticipantModel.find(
            { user: new mongoose.Types.ObjectId(currentUserId), muted: false, unreadCount: { $gt: 0 } },
            { channel: 1 }
        ).lean(),
        ChannelInviteModel.find({ invitedUser: currentUserId }, { channel: 1, author: 1 })
            .populate<{ author: { active: boolean } | null }>({ path: "author", select: { active: 1 }, match: { active: true } })
            .lean()
    ]);

    const unseenChannelIds = unseenParticipants.map(p => p.channel.toString());
    const inviteChannelIds = invites.filter(i => i.author !== null).map(i => i.channel.toString());

    const allUniqueChannelIds = [...new Set([...unseenChannelIds, ...inviteChannelIds])];

    res.json({ success: true, data: { count: allUniqueChannelIds.length, channelIds: allUniqueChannelIds } });
});

const muteChannel = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(muteChannelSchema, req);
    const { channelId, muted } = body;
    const currentUserId = req.userId;

    const participant = await ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId });
    if (!participant) {
        throw new HttpError("Not a member of this channel", 403);
    }

    participant.muted = muted;
    await participant.save();

    res.json({ success: true, data: { muted: participant.muted } });
});

const markMessagesSeenWS = async (socket: Socket, payload: unknown) => {
    try {
        const { channelId } = markMessagesSeenWSSchema.parse(payload);
        const currentUserId = socket.data.userId;

        const participant = await ChannelParticipantModel.findOne({ user: currentUserId, channel: channelId });
        if (!participant) {
            throw new Error("Not a member of this channel");
        }

        participant.lastActiveAt = new Date();
        participant.unreadCount = 0;
        await participant.save();

        socket.emit("channels:messages_seen", {
            channelId,
            userId: currentUserId,
            lastActiveAt: participant.lastActiveAt
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        } else if (err instanceof Error) {
            socket.emit("channels:error", { error: [{ message: err.message }] });
        }
    }
};

const createMessageWS = async (socket: Socket, payload: unknown) => {
    try {
        const { channelId, content, repliedTo } = createMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;

        const channel = await ChannelModel.findById(channelId).lean();
        if (!channel) {
            throw new Error("Channel not found");
        }

        const participant = await ChannelParticipantModel.findOne({ channel: channelId, user: currentUserId }).lean();
        if (!participant) {
            throw new Error("Not a member of this channel");
        }

        if(channel._type === ChannelTypeEnum.DM && await isBlocked(channel.createdBy, channel.DMUser!)) {
            throw new Error("You cannot send messages to this user");
        }

        const newMessage = new ChannelMessageModel({
            _type: ChannelMessageTypeEnum.MESSAGE,
            content,
            channel: channelId,
            repliedTo: repliedTo,
            user: currentUserId
        });
        await saveChannelMessage(newMessage);


        if (channel._type === ChannelTypeEnum.DM) {
            const messages = await ChannelMessageModel.find({ channel: channel._id }, { _id: 1 }).limit(2).lean();
            if (messages.length === 1) {
                const exists = await ChannelParticipantModel.exists({ channel: channel._id, user: channel.DMUser });
                if (!exists) {
                    await inviteToChannel(channel.createdBy, channel.DMUser!, channel._id);
                }
            }
        }
    } catch (err) {
        if (err instanceof z.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        } else if (err instanceof Error) {
            socket.emit("channels:error", { error: [{ message: err.message }] });
        }
    }
};

const deleteMessageWS = async (socket: Socket, payload: unknown) => {
    try {
        const { messageId } = deleteMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;

        const message = await ChannelMessageModel.findById(messageId);
        if (!message || !message.user.equals(currentUserId)) {
            throw new Error("Message not found");
        }

        message.deleted = true;
        await saveChannelMessage(message);
    } catch (err) {
        if (err instanceof z.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        } else if (err instanceof Error) {
            socket.emit("channels:error", { error: [{ message: err.message }] });
        }
    }
};

const editMessageWS = async (socket: Socket, payload: unknown) => {
    try {
        const { messageId, content } = editMessageWSSchema.parse(payload);
        const currentUserId = socket.data.userId;

        const message = await ChannelMessageModel.findById(messageId);
        if (!message || !message.user.equals(currentUserId)) {
            throw new Error("Message not found");
        }

        message.content = content;
        await saveChannelMessage(message);
    } catch (err) {
        if (err instanceof z.ZodError) {
            socket.emit("channels:error", { error: err.issues.map(e => ({ message: e.message })) });
        } else if (err instanceof Error) {
            socket.emit("channels:error", { error: [{ message: err.message }] });
        }
    }
};

const registerHandlersWS = (socket: Socket) => {
    socket.on("channels:messages_seen", (payload) => markMessagesSeenWS(socket, payload));
    socket.on("channels:send_message", (payload) => createMessageWS(socket, payload));
    socket.on("channels:delete_message", (payload) => deleteMessageWS(socket, payload));
    socket.on("channels:edit_message", (payload) => editMessageWS(socket, payload));
};

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

export { registerHandlersWS };
export default channelsController;
