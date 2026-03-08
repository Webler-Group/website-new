import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import PostModel, { Post } from "../models/Post";
import UpvoteModel from "../models/Upvote";
import mongoose, { Types } from "mongoose";
import { escapeMarkdown, escapeRegex } from "../utils/regexUtils";
import UserFollowingModel from "../models/UserFollowing";
import { truncate } from "../utils/StringUtils";
import PostTypeEnum from "../data/PostTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import ReactionsEnum from "../data/ReactionsEnum";
import {
    createFeedSchema,
    editFeedSchema,
    deleteFeedSchema,
    createReplySchema,
    editReplySchema,
    deleteReplySchema,
    shareFeedSchema,
    getFeedListSchema,
    getFeedSchema,
    getRepliesSchema,
    togglePinFeedSchema,
    votePostSchema,
    getUserReactionsSchema
} from "../validation/feedSchema";
import { parseWithZod } from "../utils/zodUtils";
import RolesEnum from "../data/RolesEnum";
import { getImageUrl } from "./mediaController";
import { deleteNotifications, sendNotifications } from "../helpers/notificationHelper";
import { deletePostsAndCleanup, getAttachmentsByPostId } from "../helpers/postsHelper";
import { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { formatUserMinimal } from "../helpers/userHelper";

type ReactionAgg = { _id: ReactionsEnum; count: number };

const getReactionsForPost = async (postId: Types.ObjectId) => {
    const reactionsAgg = await UpvoteModel.aggregate<ReactionAgg>([
        { $match: { parentId: postId } },
        { $group: { _id: "$reaction", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    return {
        totalReactions: reactionsAgg.reduce((sum, r) => sum + r.count, 0),
        topReactions: reactionsAgg.slice(0, 3).map(r => ({ reaction: r._id, count: r.count }))
    };
};

const createFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createFeedSchema, req);
    const { message } = body;
    const currentUserId = req.userId;

    const feed = await PostModel.create({
        _type: PostTypeEnum.FEED,
        title: "Untitled",
        message,
        user: currentUserId
    });

    const followers = await UserFollowingModel.find({ following: currentUserId }).lean();

    await sendNotifications(
        {
            title: "New post",
            type: NotificationTypeEnum.FEED_FOLLOWER_POST,
            actionUser: new Types.ObjectId(currentUserId),
            message: `{action_user} made a new post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
            feedId: feed._id
        },
        followers.filter(x => !x.user.equals(currentUserId)).map(x => x.user)
    );

    res.json({
        success: true,
        feed: {
            type: feed._type,
            id: feed._id,
            title: feed.title,
            message: feed.message,
            date: feed.createdAt,
            userId: feed.user,
            isAccepted: feed.isAccepted,
            votes: feed.votes,
            answers: feed.answers
        }
    });
});

const getUserReactions = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUserReactionsSchema, req);
    const { parentId, page, count } = body;
    const currentUserId = req.userId;

    const skip = (page - 1) * count;
    const parentObjectId = new mongoose.Types.ObjectId(parentId);
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);

    type UserReactionAgg = {
        _id: Types.ObjectId;
        userId: Types.ObjectId;
        userName: string;
        userHash: string;
        level: number;
        roles: string[];
        reaction: ReactionsEnum;
        isFollowing: boolean;
    };

    const [reactions, totalCount] = await Promise.all([
        UpvoteModel.aggregate<UserReactionAgg>([
            { $match: { parentId: parentObjectId } },
            { $sort: { _id: -1 } },
            { $skip: skip },
            { $limit: count },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            {
                $lookup: {
                    from: "userfollowings",
                    let: { targetUserId: "$user" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$user", currentUserObjectId] },
                                        { $eq: ["$following", "$$targetUserId"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "isFollowing"
                }
            },
            {
                $project: {
                    userId: "$userDetails._id",
                    userName: "$userDetails.name",
                    userHash: "$userDetails.avatarHash",
                    level: "$userDetails.level",
                    roles: "$userDetails.roles",
                    reaction: { $ifNull: ["$reaction", ReactionsEnum.LIKE] },
                    isFollowing: { $gt: [{ $size: "$isFollowing" }, 0] }
                }
            }
        ]),
        UpvoteModel.countDocuments({ parentId })
    ]);

    res.json({
        count: totalCount,
        userReactions: reactions.map(x => ({
            id: x._id,
            userId: x.userId,
            userName: x.userName,
            userAvatarUrl: getImageUrl(x.userHash),
            isFollowing: x.isFollowing,
            reaction: x.reaction
        }))
    });
});

const editFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editFeedSchema, req);
    const { feedId, message } = body;
    const currentUserId = req.userId;

    const feed = await PostModel.findById(feedId);
    if (!feed) {
        res.status(404).json({ error: [{ message: "Feed not found" }] });
        return;
    }

    if (!feed.user.equals(currentUserId)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    feed.message = message;
    await feed.save();

    const attachments = await getAttachmentsByPostId({ post: feed._id });

    res.json({
        success: true,
        data: {
            id: feed._id,
            title: feed.title,
            message: feed.message,
            attachments
        }
    });
});

const deleteFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteFeedSchema, req);
    const { feedId } = body;
    const currentUserId = req.userId;

    const feed = await PostModel.findById(feedId).lean();
    if (!feed) {
        res.status(404).json({ error: [{ message: "Feed not found" }] });
        return;
    }

    if (!feed.user.equals(currentUserId) && !req.roles?.some(role => [RolesEnum.ADMIN, RolesEnum.MODERATOR].includes(role))) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    await deletePostsAndCleanup({ _id: feedId });

    res.json({ success: true });
});

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createReplySchema, req);
    const { message, feedId, parentId } = body;
    const currentUserId = req.userId;

    const feed = await PostModel.findById(feedId);
    if (!feed) {
        res.status(404).json({ error: [{ message: "Feed not found" }] });
        return;
    }

    let parentComment = null;
    if (parentId) {
        parentComment = await PostModel.findById(parentId);
        if (!parentComment) {
            res.status(404).json({ error: [{ message: "Parent comment not found" }] });
            return;
        }
    }

    const reply = await PostModel.create({
        _type: PostTypeEnum.FEED_COMMENT,
        message,
        feedId,
        parentId,
        user: currentUserId
    });

    if (parentComment && !parentComment.user.equals(currentUserId)) {
        await sendNotifications({
            title: "New reply",
            type: NotificationTypeEnum.FEED_COMMENT,
            actionUser: new Types.ObjectId(currentUserId),
            message: `{action_user} replied to your comment on post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
            feedId: feed._id,
            postId: reply._id
        }, [parentComment.user]);
    }

    if (!feed.user.equals(currentUserId) && (!parentComment || !feed.user.equals(parentComment.user))) {
        await sendNotifications({
            title: "New comment",
            type: NotificationTypeEnum.FEED_COMMENT,
            actionUser: new Types.ObjectId(currentUserId),
            message: `{action_user} commented on your post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
            feedId: feed._id,
            postId: reply._id
        }, [feed.user]);
    }

    feed.$inc("answers", 1);
    await feed.save();

    if (parentComment) {
        parentComment.$inc("answers", 1);
        await parentComment.save();
    }

    const attachments = await getAttachmentsByPostId({ post: reply._id });

    res.json({
        post: {
            id: reply._id,
            message: reply.message,
            date: reply.createdAt,
            userId: reply.user,
            parentId: reply.parentId,
            votes: reply.votes,
            answers: reply.answers ?? 0,
            attachments
        }
    });
});

const votePost = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(votePostSchema, req);
    const { postId, vote, reaction } = body;
    const currentUserId = req.userId;

    const post = await PostModel.findById(postId);
    if (!post) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    let upvote = await UpvoteModel.findOne({ parentId: postId, user: currentUserId });
    if (vote) {
        if (!upvote) {
            upvote = await UpvoteModel.create({ user: currentUserId, parentId: postId, reaction: reaction || ReactionsEnum.LIKE });
            post.$inc("votes", 1);
            await post.save();
        } else if (reaction) {
            upvote.reaction = reaction || ReactionsEnum.LIKE;
            await upvote.save();
        }
    } else {
        if (upvote) {
            await UpvoteModel.deleteOne({ _id: upvote._id });
            upvote = null;
            post.$inc("votes", -1);
            await post.save();
        }
    }

    res.json({ success: true, vote: upvote ? 1 : 0 });
});

const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editReplySchema, req);
    const { id, message } = body;
    const currentUserId = req.userId;

    const reply = await PostModel.findById(id);
    if (!reply) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (!reply.user.equals(currentUserId)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    reply.message = message;
    await reply.save();

    const attachments = await getAttachmentsByPostId({ post: reply._id });

    res.json({
        success: true,
        data: { id: reply._id, message: reply.message, attachments }
    });
});

const deleteReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteReplySchema, req);
    const { id } = body;
    const currentUserId = req.userId;

    const reply = await PostModel.findById(id).lean();
    if (!reply) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (!reply.user.equals(currentUserId)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const feed = await PostModel.findById(reply.feedId).lean();
    if (!feed) {
        res.status(404).json({ error: [{ message: "Feed not found" }] });
        return;
    }

    await deletePostsAndCleanup({ _id: id });

    res.json({ success: true });
});

const shareFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(shareFeedSchema, req);
    const { feedId, message } = body;
    const currentUserId = req.userId;

    const originalFeed = await PostModel.findById(feedId);
    if (!originalFeed) {
        res.status(404).json({ error: [{ message: "Feed not found" }] });
        return;
    }

    const feed = await PostModel.create({
        _type: PostTypeEnum.SHARED_FEED,
        title: "Untitled",
        message,
        user: currentUserId,
        parentId: feedId
    });

    originalFeed.$inc("shares", 1);
    await originalFeed.save();

    if (!originalFeed.user.equals(currentUserId)) {
        await sendNotifications({
            title: "Feed share",
            type: NotificationTypeEnum.FEED_SHARE,
            actionUser: new Types.ObjectId(currentUserId),
            message: `{action_user} shared your Post "${truncate(escapeMarkdown(originalFeed.message), 20).replaceAll(/\n+/g, " ")}"`,
            feedId: feed._id
        }, [originalFeed.user]);
    }

    res.json({
        success: true,
        feed: {
            id: feed._id,
            title: feed.title,
            message: feed.message,
            date: feed.createdAt,
            userId: feed.user,
            votes: feed.votes,
            answers: feed.answers,
            parentId: feedId
        }
    });
});

const getFeedList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getFeedListSchema, req);
    const { page, count, filter, searchQuery, userId } = body;
    const currentUserId = req.userId;

    const baseMatch: mongoose.QueryFilter<Post> = {
        _type: { $in: [PostTypeEnum.FEED, PostTypeEnum.SHARED_FEED] },
        hidden: false,
        ...(filter !== 7 && { isPinned: false })
    };

    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = escapeRegex(searchQuery.trim());
        baseMatch.message = new RegExp(`(^|\\b)${safeQuery}`, "i");
    }

    let dbQuery = PostModel.find(baseMatch);

    switch (filter) {
        case 1:
            dbQuery = dbQuery.sort({ createdAt: "desc" });
            break;
        case 2:
            if (!userId) {
                res.status(400).json({ error: [{ message: "Invalid request - userId required" }] });
                return;
            }
            dbQuery = dbQuery.where({ user: userId }).sort({ createdAt: "desc" });
            break;
        case 3:
            if (!userId) {
                res.status(400).json({ error: [{ message: "Invalid request - userId required" }] });
                return;
            }
            const followingUsers = await UserFollowingModel.find({ user: userId }).select("following").lean();
            const followingUserIds = followingUsers.map(f => f.following);
            if (!followingUserIds.length) {
                res.status(200).json({ count: 0, feeds: [], success: true });
                return;
            }
            dbQuery = dbQuery.where({ user: { $in: followingUserIds } }).sort({ createdAt: "desc" });
            break;
        case 4:
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            dbQuery = dbQuery.where({ createdAt: { $gt: dayAgo } }).sort({ votes: "desc" });
            break;
        case 5:
            dbQuery = dbQuery.sort({ votes: "desc" });
            break;
        case 6:
            dbQuery = dbQuery.sort({ shares: "desc" });
            break;
        case 7:
            dbQuery = dbQuery.where({ isPinned: true }).sort({ createdAt: "desc" });
            break;
        default:
            res.status(400).json({ error: [{ message: "Unknown filter" }] });
            return;
    }

    const [feedCount, feeds] = await Promise.all([
        dbQuery.clone().countDocuments(),
        dbQuery
            .clone()
            .skip((page - 1) * count)
            .limit(count)
            .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
            .populate<{ parentId: Post & { _id: Types.ObjectId, user: UserMinimal & { _id: Types.ObjectId } } }>({
                path: "parentId",
                populate: { path: "user", select: USER_MINIMAL_FIELDS }
            })
            .lean()
    ]);

    const data = await Promise.all(feeds.map(async x => {
        const [{ totalReactions, topReactions }, attachments, upvote] = await Promise.all([
            getReactionsForPost(x._id),
            getAttachmentsByPostId({ post: x._id }),
            currentUserId ? UpvoteModel.findOne({ parentId: x._id, user: currentUserId }).lean() : null
        ]);

        const originalPost = x.parentId as (Post & { _id: Types.ObjectId, user: UserMinimal & { _id: Types.ObjectId } }) | null;

        return {
            id: x._id,
            type: x._type,
            title: x.title ?? null,
            message: x.message,
            date: x.createdAt,
            user: formatUserMinimal(x.user),
            answers: x.answers ?? 0,
            votes: x.votes ?? 0,
            shares: x.shares ?? 0,
            isUpvoted: !!upvote,
            reaction: upvote?.reaction ?? "",
            score: (x.votes ?? 0) + (x.shares ?? 0) + (x.answers ?? 0),
            isPinned: x.isPinned,
            attachments,
            originalPost: originalPost ? {
                id: originalPost._id,
                title: originalPost.title ?? null,
                message: truncate(escapeMarkdown(originalPost.message), 40),
                user: formatUserMinimal(originalPost.user),
                date: originalPost.createdAt
            } : null,
            totalReactions,
            topReactions
        };
    }));

    res.status(200).json({ count: feedCount, feeds: data, success: true });
});

const getFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getFeedSchema, req);
    const { feedId } = body;
    const currentUserId = req.userId;

    const feed = await PostModel.findById(feedId)
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
        .populate<{ parentId: Post & { _id: Types.ObjectId, user: UserMinimal & { _id: Types.ObjectId } } }>({
            path: "parentId",
            populate: { path: "user", select: USER_MINIMAL_FIELDS }
        })
        .lean();

    if (!feed) {
        res.status(404).json({ error: [{ message: "Feed not found" }] });
        return;
    }

    const [{ totalReactions, topReactions }, attachments, upvote] = await Promise.all([
        getReactionsForPost(feed._id),
        getAttachmentsByPostId({ post: feed._id }),
        currentUserId ? UpvoteModel.findOne({ parentId: feed._id, user: currentUserId }).lean() : null
    ]);

    const originalPost = feed.parentId as (Post & { _id: Types.ObjectId, user: UserMinimal & { _id: Types.ObjectId } }) | null;

    res.json({
        success: true,
        feed: {
            id: feed._id,
            type: feed._type,
            title: feed.title ?? null,
            message: feed.message,
            date: feed.createdAt,
            user: formatUserMinimal(feed.user),
            answers: feed.answers,
            votes: feed.votes,
            shares: feed.shares,
            isPinned: feed.isPinned,
            attachments,
            isUpvoted: !!upvote,
            reaction: upvote?.reaction ?? "",
            originalPost: originalPost ? {
                id: originalPost._id,
                title: originalPost.title ?? null,
                message: truncate(escapeMarkdown(originalPost.message), 40),
                user: formatUserMinimal(originalPost.user),
                date: originalPost.createdAt
            } : null,
            totalReactions,
            topReactions
        }
    });
});

const getReplies = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getRepliesSchema, req);
    const { feedId, parentId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    type PopulatedPost = Post & { _id: Types.ObjectId; user: UserMinimal & { _id: Types.ObjectId } };

    let parentPost: PopulatedPost | null = null;
    if (parentId) {
        parentPost = await PostModel.findById(parentId)
            .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
            .lean<PopulatedPost>();
        if (!parentPost) {
            res.status(404).json({ error: [{ message: "Parent post not found" }] });
            return;
        }
    }

    let dbQuery = PostModel.find({ feedId, _type: PostTypeEnum.FEED_COMMENT, hidden: false });
    let skipCount = index;

    if (findPostId) {
        const reply = await PostModel.findById(findPostId).lean();
        if (!reply) {
            res.status(404).json({ error: [{ message: "Post not found" }] });
            return;
        }

        parentPost = reply.parentId
            ? await PostModel.findById(reply.parentId)
                .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
                .lean<PopulatedPost>()
            : null;

        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });
        skipCount = Math.max(0, await dbQuery.clone().where({ createdAt: { $lt: reply.createdAt } }).countDocuments());
        dbQuery = dbQuery.sort({ createdAt: "asc" });
    } else {
        dbQuery = dbQuery.where({ parentId });
        switch (filter) {
            case 1: dbQuery = dbQuery.sort({ votes: "desc", createdAt: "desc" }); break;
            case 2: dbQuery = dbQuery.sort({ createdAt: "asc" }); break;
            case 3: dbQuery = dbQuery.sort({ createdAt: "desc" }); break;
            default:
                res.status(400).json({ error: [{ message: "Unknown filter" }] });
                return;
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
        .lean<PopulatedPost[]>();

    const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
        id: x._id,
        parentId: x.parentId,
        message: x.message,
        date: x.createdAt,
        user: formatUserMinimal(x.user),
        votes: x.votes,
        isUpvoted: false,
        answers: x.answers,
        index: findPostId && parentPost ? (offset === 0 ? -1 : skipCount + offset - 1) : skipCount + offset,
        attachments: [] as Awaited<ReturnType<typeof getAttachmentsByPostId>>
    }));

    await Promise.all(data.map((item, i) => Promise.all([
        currentUserId
            ? UpvoteModel.findOne({ parentId: item.id, user: currentUserId }).lean().then(upvote => { data[i].isUpvoted = !!upvote; })
            : Promise.resolve(),
        getAttachmentsByPostId({ post: item.id }).then(attachments => { data[i].attachments = attachments; })
    ])));

    res.json({ posts: data });
});

const togglePinFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(togglePinFeedSchema, req);
    const { feedId, pinned } = body;
    const currentUserId = req.userId;

    const feed = await PostModel.findById(feedId);
    if (!feed) {
        res.status(404).json({ error: [{ message: "Feed not found" }] });
        return;
    }

    if (!feed.user.equals(currentUserId)) {
        if (pinned) {
            await sendNotifications({
                title: "Feed pin",
                type: NotificationTypeEnum.FEED_PIN,
                actionUser: new Types.ObjectId(currentUserId),
                message: `{action_user} pinned your Post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
                feedId: feed._id
            }, [feed.user]);
        } else {
            await deleteNotifications({
                _type: NotificationTypeEnum.FEED_PIN,
                user: feed.user,
                actionUser: currentUserId,
                feedId: feed._id
            });
        }
    }

    feed.isPinned = pinned;
    await feed.save();

    res.json({ success: true, data: { isPinned: feed.isPinned } });
});

const feedController = {
    createFeed,
    editFeed,
    deleteFeed,
    createReply,
    editReply,
    deleteReply,
    shareFeed,
    getFeedList,
    getFeed,
    getReplies,
    togglePinFeed,
    votePost,
    getUserReactions
};

export default feedController;