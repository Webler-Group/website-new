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
import { deleteNotifications, sendNotifications } from "../helpers/notificationHelper";
import { deletePostsAndCleanup, getAttachmentsByPostId, savePost } from "../helpers/postsHelper";
import { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { formatUserMinimal } from "../helpers/userHelper";
import { withTransaction } from "../utils/transaction";
import HttpError from "../exceptions/HttpError";
import { deleteComment, editComment, getCommmentsList } from "../helpers/commentsHelper";
import { FeedDetails, formatFeedDetails, getReactionsForPost } from "../helpers/feedHelper";
import { getBlockedUserIds, isBlocked } from "../helpers/blockHelper";

const createFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createFeedSchema, req);
    const { message } = body;
    const currentUserId = req.userId;

    const feed = await withTransaction(async (session) => {
        const feed = new PostModel({
            _type: PostTypeEnum.FEED,
            message,
            user: currentUserId
        });
        const notifications = await savePost(feed, session);

        const followers = await UserFollowingModel.find({ following: currentUserId }).lean().session(session);
        await sendNotifications(
            {
                title: "New post",
                type: NotificationTypeEnum.FEED_FOLLOWER_POST,
                actionUser: new Types.ObjectId(currentUserId),
                message: `{action_user} made a new post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
                feedId: feed._id
            },
            followers.filter(x => !x.user.equals(currentUserId) && !notifications.some(y => x.user.equals(y.user))).map(x => x.user)
        );

        return feed;
    });

    res.json({
        success: true,
        data: {
            feed: {
                type: feed._type,
                id: feed._id,
                message: feed.message,
                date: feed.createdAt,
                userId: feed.user,
                votes: feed.votes,
                answers: feed.answers
            }
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

    const [reactions, totalCount] = await Promise.all([
        UpvoteModel.aggregate<{
            _id: Types.ObjectId;
            user: UserMinimal & { _id: Types.ObjectId };
            reaction: ReactionsEnum;
        }>([
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
                    as: "followingDetails"
                }
            },
            {
                $project: {
                    reaction: { $ifNull: ["$reaction", ReactionsEnum.LIKE] },
                    user: {
                        _id: "$userDetails._id",
                        name: "$userDetails.name",
                        avatarHash: "$userDetails.avatarHash",
                        level: "$userDetails.level",
                        roles: "$userDetails.roles",
                        countryCode: { $ifNull: ["$userDetails.countryCode", null] },
                        isFollowing: { $gt: [{ $size: "$followingDetails" }, 0] }
                    }
                }
            }
        ]),
        UpvoteModel.countDocuments({ parentId })
    ]);

    res.json({
        success: true,
        data: {
            count: totalCount,
            userReactions: reactions.map(x => ({
                id: x._id,
                user: formatUserMinimal(x.user),
                reaction: x.reaction
            }))
        }
    });
});

const editFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editFeedSchema, req);
    const { feedId, message } = body;
    const currentUserId = req.userId;

    const feed = await PostModel.findById(feedId);
    if (!feed) {
        throw new HttpError("Feed not found", 404);
    }

    if (!feed.user.equals(currentUserId)) {
        throw new HttpError("Unauthorized", 401);
    }

    feed.message = message;
    await withTransaction(async (session) => {
        await savePost(feed, session);
    });

    const attachments = await getAttachmentsByPostId({ post: feed._id });

    res.json({
        success: true,
        data: {
            id: feed._id,
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
        throw new HttpError("Feed not found", 404);
    }

    if (!feed.user.equals(currentUserId) && !req.roles?.some(role => [RolesEnum.ADMIN, RolesEnum.MODERATOR].includes(role))) {
        throw new HttpError("Unauthorized", 401);
    }

    await withTransaction(async (session) => {
        await deletePostsAndCleanup({ _id: feedId }, session);
    });

    res.json({ success: true });
});

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createReplySchema, req);
    const { message, feedId, parentId } = body;
    const currentUserId = req.userId!;

    const reply = await withTransaction(async (session) => {
        const feed = await PostModel.findById(feedId).session(session);
        if (!feed) throw new HttpError("Feed not found", 404);

        if (await isBlocked(currentUserId, feed.user, session)) {
            throw new HttpError("You cannot comment on this post", 404);
        }

        let parentComment = null;
        if (parentId) {
            parentComment = await PostModel.findById(parentId).session(session);
            if (!parentComment) throw new HttpError("Parent comment not found", 404);
        }

        const reply = new PostModel({
            _type: PostTypeEnum.FEED_COMMENT,
            message,
            feedId,
            parentId,
            user: currentUserId
        });
        const notifications = await savePost(reply, session);

        if (parentComment && !parentComment.user.equals(currentUserId) && !notifications.some(x => x.user.equals(parentComment.user))) {
            await sendNotifications({
                title: "New reply",
                type: NotificationTypeEnum.FEED_COMMENT,
                actionUser: new Types.ObjectId(currentUserId),
                message: `{action_user} replied to your comment on post "${truncate(escapeMarkdown(feed.message), 20).replaceAll(/\n+/g, " ")}"`,
                feedId: feed._id,
                postId: reply._id
            }, [parentComment.user]);
        }

        if (!feed.user.equals(currentUserId) && (!parentComment || !feed.user.equals(parentComment.user)) && !notifications.some(x => x.user.equals(feed.user))) {
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
        await feed.save({ session });

        if (parentComment) {
            parentComment.$inc("answers", 1);
            await savePost(parentComment, session);
        }

        return reply;
    });

    const attachments = await getAttachmentsByPostId({ post: reply._id });

    res.json({
        success: true,
        data: {
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                parentId: reply.parentId,
                votes: reply.votes,
                answers: reply.answers ?? 0,
                attachments
            }
        }
    });
});

const votePost = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(votePostSchema, req);
    const { postId, vote, reaction } = body;
    const currentUserId = req.userId!;

    const result = await withTransaction(async (session) => {
        const post = await PostModel.findById(postId).session(session);
        if (!post) throw new HttpError("Post not found", 404);

        if (await isBlocked(currentUserId, post.user, session)) {
            throw new HttpError("You cannot vote this post", 404);
        }

        let upvote = await UpvoteModel.findOne({ parentId: postId, user: currentUserId }).session(session);

        if (vote) {
            if (!upvote) {
                [upvote] = await UpvoteModel.create(
                    [{ user: currentUserId, parentId: postId, reaction: reaction || ReactionsEnum.LIKE }],
                    { session }
                );
                post.$inc("votes", 1);
                await post.save({ session });
            } else if (reaction) {
                upvote.reaction = reaction;
                await upvote.save({ session });
            }
        } else {
            if (upvote) {
                await UpvoteModel.deleteOne({ _id: upvote._id }, { session });
                upvote = null;
                post.$inc("votes", -1);
                await post.save({ session });
            }
        }

        return upvote;
    });

    res.json({ success: true, data: { vote: result ? 1 : 0 } });
});

const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editReplySchema, req);
    const { id, message } = body;
    const currentUserId = req.userId;

    const data = await editComment(id, currentUserId!, message);

    res.json({
        success: true,
        data
    });
});

const deleteReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteReplySchema, req);
    const { id } = body;
    const currentUserId = req.userId;

    await deleteComment(id, currentUserId!);

    res.json({ success: true });
});

const shareFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(shareFeedSchema, req);
    const { feedId, message } = body;
    const currentUserId = req.userId;

    const feed = await withTransaction(async (session) => {
        const originalFeed = await PostModel.findById(feedId).session(session);
        if (!originalFeed) throw new HttpError("Feed not found", 404);

        const feed = new PostModel({
            _type: PostTypeEnum.SHARED_FEED,
            message,
            user: currentUserId,
            parentId: feedId
        });
        const notifications = await savePost(feed, session);

        if (!originalFeed.user.equals(currentUserId) && !notifications.some(x => x.user.equals(originalFeed.user))) {
            await sendNotifications({
                title: "Feed share",
                type: NotificationTypeEnum.FEED_SHARE,
                actionUser: new Types.ObjectId(currentUserId),
                message: `{action_user} shared your Post "${truncate(escapeMarkdown(originalFeed.message), 20).replaceAll(/\n+/g, " ")}"`,
                feedId: feed._id
            }, [originalFeed.user]);
        }

        originalFeed.$inc("shares", 1);
        await savePost(originalFeed, session);

        return feed;
    });

    res.json({
        success: true,
        data: {
            feed: {
                id: feed._id,
                message: feed.message,
                date: feed.createdAt,
                userId: feed.user,
                votes: feed.votes,
                answers: feed.answers,
                parentId: feedId
            }
        }
    });
});



const getFeedList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getFeedListSchema, req);
    const { page, count, filter, searchQuery, userId } = body;
    const currentUserId = req.userId;

    const blockedIds = currentUserId ? await getBlockedUserIds(currentUserId) : [];

    const baseMatch: mongoose.QueryFilter<Post> = {
        _type: { $in: [PostTypeEnum.FEED, PostTypeEnum.SHARED_FEED] },
        hidden: false,
        user: { $nin: blockedIds },
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
                throw new HttpError("Invalid request - userId required", 400);
            }
            dbQuery = dbQuery.where({ user: userId }).sort({ createdAt: "desc" });
            break;
        case 3:
            if (!userId) {
                throw new HttpError("Invalid request - userId required", 400);
            }
            const followingUsers = await UserFollowingModel.find({ user: userId }).lean();
            const followingUserIds = followingUsers.map(f => f.following);
            if (!followingUserIds.length) {
                res.json({ success: true, data: { count: 0, feeds: [] } });
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
            throw new HttpError("Unknown filter", 400);
    }

    const [feedCount, feeds] = await Promise.all([
        dbQuery.clone().countDocuments(),
        dbQuery
            .clone()
            .skip((page - 1) * count)
            .limit(count)
            .populate("user", USER_MINIMAL_FIELDS)
            .populate({
                path: "parentId",
                populate: { path: "user", select: USER_MINIMAL_FIELDS }
            })
            .lean<FeedDetails[]>()
    ]);

    const data = await Promise.all(feeds.map(async x => {
        const [reactions, attachments, upvote] = await Promise.all([
            getReactionsForPost(x._id),
            getAttachmentsByPostId({ post: x._id }),
            currentUserId ? UpvoteModel.findOne({ parentId: x._id, user: currentUserId }).lean() : null
        ]);

        return formatFeedDetails(x, upvote, attachments, reactions);
    }));

    res.json({ success: true, data: { count: feedCount, feeds: data } });
});

const getFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getFeedSchema, req);
    const { feedId } = body;
    const currentUserId = req.userId;

    const feed = await PostModel.findById(feedId)
        .populate("user", USER_MINIMAL_FIELDS)
        .populate({
            path: "parentId",
            populate: { path: "user", select: USER_MINIMAL_FIELDS }
        })
        .lean<FeedDetails>();

    if (!feed) {
        throw new HttpError("Feed not found", 404);
    }

    if (currentUserId && await isBlocked(currentUserId, feed.user)) {
        throw new HttpError("You cannot view this post", 403);
    }

    const [reactions, attachments, upvote] = await Promise.all([
        getReactionsForPost(feed._id),
        getAttachmentsByPostId({ post: feed._id }),
        currentUserId ? UpvoteModel.findOne({ parentId: feed._id, user: currentUserId }).lean() : null
    ]);

    res.json({
        success: true,
        data: {
            feed: formatFeedDetails(feed, upvote, attachments, reactions)
        }
    });
});

const getReplies = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getRepliesSchema, req);
    const { feedId, parentId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    const data = await getCommmentsList({
        postFilter: { feedId, _type: PostTypeEnum.FEED_COMMENT },
        parentId,
        index,
        count,
        filter,
        findPostId,
        userId: currentUserId
    });

    res.json({ success: true, data: { posts: data } });
});

const togglePinFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(togglePinFeedSchema, req);
    const { feedId, pinned } = body;
    const currentUserId = req.userId;

    const result = await withTransaction(async (session) => {
        const feed = await PostModel.findById(feedId).session(session);
        if (!feed) throw new HttpError("Feed not found", 404);

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
                }, session);
            }
        }

        feed.isPinned = pinned;
        await savePost(feed, session);

        return { isPinned: feed.isPinned };
    });

    res.json({ success: true, data: { isPinned: result.isPinned } });
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
