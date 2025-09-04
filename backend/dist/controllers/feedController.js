"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReactionsSummary = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Post_1 = __importDefault(require("../models/Post"));
const Tag_1 = __importDefault(require("../models/Tag"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const Notification_1 = __importDefault(require("../models/Notification"));
const mongoose_1 = __importDefault(require("mongoose"));
const PostAttachment_1 = __importDefault(require("../models/PostAttachment"));
const regexUtils_1 = require("../utils/regexUtils");
const UserFollowing_1 = __importDefault(require("../models/UserFollowing"));
const StringUtils_1 = require("../utils/StringUtils");
const PostTypeEnum_1 = __importDefault(require("../data/PostTypeEnum"));
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const createFeed = (0, express_async_handler_1.default)(async (req, res) => {
    const { message } = req.body;
    let { title } = req.body;
    let { tags } = req.body;
    const currentUserId = req.userId;
    if (typeof message === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    const tagIds = [];
    if (!title)
        title = "Title not provided.";
    if (!tags)
        tags = [];
    for (let tagName of tags) {
        const tag = await Tag_1.default.findOne({ name: tagName });
        if (!tag) {
            res.status(400).json({ success: false, message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }
    // if (tagIds.length < 1) {
    //     res.status(400).json({ success: false, message: `Empty Tag` });
    //     return;
    // }
    // tag names
    const tagNames = [];
    for (let tagId of tagIds) {
        const tag = await Tag_1.default.findById(tagId);
        if (tag) {
            tagNames.push(tag.name);
        }
    }
    const feed = await Post_1.default.create({
        _type: PostTypeEnum_1.default.FEED,
        title,
        message,
        tags: tagIds,
        user: currentUserId,
        isAccepted: true
    });
    if (feed) {
        const followers = await UserFollowing_1.default.find({ following: currentUserId });
        followers.forEach(async (follower) => {
            await Notification_1.default.create({
                _type: NotificationTypeEnum_1.default.FEED_FOLLOWER_POST,
                user: follower.user,
                actionUser: currentUserId,
                message: `{action_user} made a new post "${(0, StringUtils_1.truncate)(feed.message, 20)}"`,
                feedId: feed._id,
            });
        });
        res.json({
            success: true,
            feed: {
                type: feed._type,
                id: feed._id,
                title: feed.title,
                message: feed.message,
                tags: tagNames,
                date: feed.createdAt,
                userId: feed.user,
                isAccepted: feed.isAccepted,
                votes: feed.votes,
                answers: feed.answers
            }
        });
    }
    else {
        res.status(500).json({ success: false, message: "Error" });
    }
});
const getReactions = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { parentId } = req.body;
        let { page, limit } = req.body;
        if (!page)
            page = 1;
        if (!limit)
            limit = 10;
        const skip = (page - 1) * limit;
        if (!mongoose_1.default.Types.ObjectId.isValid(parentId)) {
            res.status(400).json({ error: "Invalid parentId" });
            return;
        }
        const pipeline = [
            { $match: { parentId: new mongoose_1.default.Types.ObjectId(parentId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $group: {
                    _id: "$reaction",
                    users: {
                        $push: {
                            _id: "$user._id",
                            name: "$user.name",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    reaction: "$_id",
                    count: 1,
                    users: { $slice: ["$users", skip, limit] },
                },
            },
            { $sort: { count: -1 } } // order by most used reaction
        ];
        const reactions = await Upvote_1.default.aggregate(pipeline);
        // compute totals + top 3
        const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
        const topReactions = reactions.slice(0, 3).map(r => ({
            reaction: r.reaction,
            count: r.count
        }));
        res.json({
            page,
            limit,
            totalReactions,
            topReactions,
            reactions,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});
const editFeed = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { feedId, message } = req.body;
    let { title, tags } = req.body;
    if (typeof message === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    const feed = await Post_1.default.findById(feedId);
    if (!title)
        title = "Title not provided.";
    if (!tags)
        tags = [];
    if (feed === null) {
        res.status(404).json({ success: false, message: "Feed not found" });
        return;
    }
    if (feed.user != currentUserId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    const tagIds = [];
    let promises = [];
    for (let tagName of tags) {
        promises.push(Tag_1.default.findOne({ name: tagName })
            .then(tag => {
            if (tag)
                tagIds.push(tag._id);
        }));
    }
    await Promise.all(promises);
    feed.title = title;
    feed.message = message;
    feed.tags = tagIds;
    try {
        await feed.save();
        res.json({
            success: true,
            data: {
                id: feed._id,
                title: feed.title,
                message: feed.message,
                tags: feed.tags
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            message: err,
            data: null
        });
    }
});
const deleteFeed = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { feedId } = req.body;
    const feed = await Post_1.default.findById(feedId);
    if (feed === null) {
        res.status(404).json({ success: false, message: "Feed not found" });
        return;
    }
    if (feed.user != currentUserId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    try {
        await Post_1.default.deleteAndCleanup({ _id: feedId });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, message: err });
    }
});
const createReply = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { message, feedId, parentId } = req.body;
    // Validate feed existence
    const feed = await Post_1.default.findById(feedId);
    if (!feed) {
        res.status(404).json({ success: false, message: "Feed not found" });
        return;
    }
    let parentComment = null;
    if (parentId) {
        // replying to a comment
        parentComment = await Post_1.default.findById(parentId);
        if (!parentComment) {
            res.status(404).json({ success: false, message: "Parent comment not found" });
            return;
        }
    }
    // Create reply (whether to feed or comment)
    const reply = await Post_1.default.create({
        _type: PostTypeEnum_1.default.FEED_COMMENT,
        message,
        feedId,
        parentId,
        user: currentUserId
    });
    if (reply) {
        const usersToNotify = new Set();
        usersToNotify.add(feed.user.toString());
        if (parentComment !== null) {
            usersToNotify.add(parentComment.user.toString());
        }
        usersToNotify.delete(currentUserId);
        for (let userToNotify of usersToNotify) {
            await Notification_1.default.create({
                _type: NotificationTypeEnum_1.default.FEED_COMMENT,
                user: userToNotify,
                actionUser: currentUserId,
                message: userToNotify === feed.user.toString() ?
                    `{action_user} commented on your post "${(0, StringUtils_1.truncate)(feed.message, 20)}"`
                    :
                        `{action_user} replied to your comment on post "${(0, StringUtils_1.truncate)(feed.message, 20)}"`,
                feedId: feed._id,
                postId: reply._id
            });
        }
        // Increment answers count on the main feed
        feed.$inc("answers", 1);
        await feed.save();
        if (parentComment) {
            parentComment.$inc("answers", 1);
            await parentComment.save();
        }
        const attachments = await PostAttachment_1.default.getByPostId({ post: reply._id });
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
    }
    else {
        res.status(500).json({ message: "Error creating reply" });
    }
});
const votePost = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { postId, vote, reaction } = req.body;
    if (typeof vote === "undefined" || typeof reaction === "undefined" || typeof postId === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    const post = await Post_1.default.findById(postId);
    if (post === null) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
    }
    let upvote = await Upvote_1.default.findOne({ parentId: postId, user: currentUserId });
    if (vote === true) {
        if (!upvote) {
            upvote = await Upvote_1.default.create({ user: currentUserId, parentId: postId, reaction: reaction });
            post.$inc("votes", 1);
            await post.save();
        }
        else {
            upvote.reaction = reaction;
            await upvote.save();
        }
    }
    else if (vote === false) {
        if (upvote) {
            await Upvote_1.default.deleteOne({ _id: upvote._id });
            upvote = null;
            post.$inc("votes", -1);
            await post.save();
        }
    }
    let reactionSummary = await (0, exports.getReactionsSummary)(postId);
    res.json({ vote: upvote ? 1 : 0, success: true, reactionSummary });
});
const editReply = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    // const currentUserId = "68a7400f3dd5eef60a166911";
    const { id, message } = req.body;
    if (typeof message === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    const reply = await Post_1.default.findById(id);
    if (reply === null) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
    }
    if (currentUserId != reply.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    reply.message = message;
    try {
        await reply.save();
        const attachments = await PostAttachment_1.default.getByPostId({ post: reply._id });
        res.json({
            success: true,
            data: {
                id: reply._id,
                message: reply.message,
                attachments
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            message: err,
            data: null
        });
    }
});
const deleteReply = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { id } = req.body;
    const reply = await Post_1.default.findById(id);
    if (reply === null) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
    }
    if (currentUserId != reply.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    const feed = await Post_1.default.findById(reply.feedId);
    if (feed === null) {
        res.status(404).json({ success: false, message: "Feed not found" });
        return;
    }
    try {
        await Post_1.default.deleteAndCleanup({ _id: id });
        res.json({ success: true });
    }
    catch (err) {
        console.log(err);
        res.json({ success: false, message: err });
    }
});
const shareFeed = (0, express_async_handler_1.default)(async (req, res) => {
    const { feedId, message } = req.body;
    let { title } = req.body;
    let { tags } = req.body;
    const currentUserId = req.userId;
    if (typeof message === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    if (!title)
        title = "Title not provided.";
    const tagIds = [];
    if (!tags)
        tags = [];
    for (let tagName of tags) {
        const tag = await Tag_1.default.findOne({ name: tagName });
        if (!tag) {
            res.status(400).json({ success: false, message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }
    const tagNames = [];
    for (let tagId of tagIds) {
        const tag = await Tag_1.default.findById(tagId);
        if (tag) {
            tagNames.push(tag);
        }
    }
    const feed = await Post_1.default.create({
        _type: PostTypeEnum_1.default.SHARED_FEED,
        title,
        message,
        tags: tagIds,
        user: currentUserId,
        isAccepted: true,
        parentId: feedId,
    });
    if (feed) {
        const post = await Post_1.default.findById(feedId);
        if (post) {
            post.$inc("shares", 1);
            await post.save();
        }
        const originalFeed = await Post_1.default.findById(feedId);
        if (!originalFeed) {
            res.status(404).json({ "message": "Feed is not available" });
            return;
        }
        if (originalFeed.user != currentUserId) {
            await Notification_1.default.create({
                _type: NotificationTypeEnum_1.default.FEED_SHARE,
                user: originalFeed.user,
                actionUser: currentUserId,
                message: `{action_user} shared your Post "${(0, StringUtils_1.truncate)(originalFeed.message, 20)}"`,
                feedId: feed._id,
            });
        }
        res.json({
            success: true,
            feed: {
                id: feed._id,
                title: feed.title,
                message: feed.message,
                tags: tagNames,
                date: feed.createdAt,
                userId: feed.user,
                votes: feed.votes,
                answers: feed.answers,
                parentId: feedId
            }
        });
    }
    else {
        res.status(500).json({ success: false, message: "Error" });
    }
});
const getFeedList = (0, express_async_handler_1.default)(async (req, res) => {
    const { page, count, filter, searchQuery } = req.body;
    const currentUserId = req.userId;
    if (typeof page === "undefined" ||
        typeof count === "undefined" ||
        typeof filter === "undefined" ||
        typeof searchQuery === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    const safeQuery = (0, regexUtils_1.escapeRegex)(searchQuery.trim());
    const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");
    let pipeline = [
        { $match: { _type: { $in: [PostTypeEnum_1.default.FEED, PostTypeEnum_1.default.SHARED_FEED] }, hidden: false } },
        {
            $set: {
                score: { $add: ["$votes", "$shares", "$answers"] }
            }
        }
    ];
    if (searchQuery.trim().length > 0) {
        const tagIds = (await Tag_1.default.find({ name: searchQuery.trim() })).map(x => x._id);
        pipeline.push({
            $match: {
                $or: [{ message: searchRegex }, { tags: { $in: tagIds } }]
            }
        });
    }
    switch (filter) {
        case 1:
            pipeline.push({ $sort: { createdAt: -1 } });
            break;
        case 2: {
            if (!currentUserId) {
                res.status(400).json({ success: false, message: "Invalid request - userId required" });
                return;
            }
            pipeline.push({ $match: { user: new mongoose_1.default.Types.ObjectId(currentUserId) } }, { $sort: { createdAt: -1 } });
            break;
        }
        case 3: {
            if (!currentUserId) {
                res.status(400).json({ success: false, message: "Authentication required" });
                return;
            }
            const followingUsers = await UserFollowing_1.default.find({ user: currentUserId }).select("following");
            const followingUserIds = followingUsers.map(f => f.following);
            if (followingUserIds.length === 0) {
                res.status(200).json({ count: 0, feeds: [], success: true });
                return;
            }
            pipeline.push({ $match: { user: { $in: followingUserIds } } }, { $sort: { createdAt: -1 } });
            break;
        }
        case 4: {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            pipeline.push({ $match: { createdAt: { $gt: dayAgo } } }, { $sort: { score: -1 } });
            break;
        }
        case 5:
            pipeline.push({ $sort: { score: -1 } });
            break;
        case 6:
            pipeline.push({ $sort: { shares: -1 } });
            break;
        case 7:
            pipeline.push({ $match: { isPinned: true } }, { $sort: { createdAt: -1 } });
            break;
        default:
            res.status(400).json({ success: false, message: "Unknown filter" });
            return;
    }
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: "total" });
    const countResult = await Post_1.default.aggregate(countPipeline);
    const feedCount = countResult.length > 0 ? countResult[0].total : 0;
    pipeline.push({ $skip: (page - 1) * count }, { $limit: count }, {
        $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "users"
        }
    }, {
        $lookup: {
            from: "tags",
            localField: "tags",
            foreignField: "_id",
            as: "tags"
        }
    }, {
        $lookup: {
            from: "postattachments",
            localField: "_id",
            foreignField: "postId",
            as: "attachments"
        }
    }, {
        $lookup: {
            from: "posts",
            localField: "parentId",
            foreignField: "_id",
            as: "originalPost",
            pipeline: [
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "users"
                    }
                },
                {
                    $lookup: {
                        from: "tags",
                        localField: "tags",
                        foreignField: "_id",
                        as: "tags"
                    }
                },
                { $limit: 1 }
            ]
        }
    }, {
        $graphLookup: {
            from: "posts",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parentId",
            as: "allReplies",
            restrictSearchWithMatch: { hidden: false }
        }
    });
    const result = await Post_1.default.aggregate(pipeline);
    if (result) {
        const data = await Promise.all(result.map(async (x) => {
            const reactionsAgg = await Upvote_1.default.aggregate([
                { $match: { parentId: x._id } },
                {
                    $group: {
                        _id: "$reaction",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);
            const totalReactions = reactionsAgg.reduce((sum, r) => sum + r.count, 0);
            const topReactions = reactionsAgg.slice(0, 3).map(r => ({
                reaction: r._id,
                count: r.count
            }));
            const feed = {
                id: x._id,
                type: x._type,
                title: x.title || null,
                message: x.message,
                tags: x.tags,
                date: x.createdAt,
                userId: x.user,
                userName: x.users.length ? x.users[0].name : "Unknown User",
                userAvatarImage: x.users.length ? x.users[0].avatarImage || null : null,
                answers: x.answers || 0,
                votes: x.votes || 0,
                shares: x.shares || 0,
                level: x.users[0].level,
                roles: x.users[0].roles,
                isUpvoted: false,
                reaction: "",
                score: x.score || 0,
                isPinned: x.isPinned,
                attachments: x.attachments?.map((a) => ({
                    id: a._id,
                    type: a.type,
                    url: a.url,
                    meta: a.meta || null
                })) || [],
                originalPost: x.originalPost.length
                    ? {
                        id: x.originalPost[0]._id,
                        title: x.originalPost[0].title || null,
                        message: x.originalPost[0].message,
                        tags: x.originalPost[0].tags,
                        userId: x.originalPost[0].user,
                        userName: x.originalPost[0].users.length
                            ? x.originalPost[0].users[0].name
                            : "Unknown User",
                        userAvatarImage: x.originalPost[0].users.length
                            ? x.originalPost[0].users[0].avatarImage || null
                            : null,
                        date: x.originalPost[0].createdAt
                    }
                    : null,
                totalReactions,
                topReactions
            };
            if (currentUserId) {
                const upvote = await Upvote_1.default.findOne({ parentId: feed.id, user: currentUserId });
                feed.isUpvoted = !!upvote;
                feed.reaction = upvote?.reaction ?? "";
                // refresh attachments via model
                feed.attachments = await PostAttachment_1.default.getByPostId({ post: feed.id });
            }
            return feed;
        }));
        res.status(200).json({
            count: feedCount,
            feeds: data,
            success: true
        });
    }
    else {
        res.status(500).json({ success: false, message: "Error fetching feed" });
    }
});
const getReactionsSummary = async (parentId) => {
    const objectId = typeof parentId === "string" ? new mongoose_1.default.Types.ObjectId(parentId) : parentId;
    const reactionsAgg = await Upvote_1.default.aggregate([
        { $match: { parentId: objectId } },
        {
            $group: {
                _id: "$reaction",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
    const totalReactions = reactionsAgg.reduce((sum, r) => sum + r.count, 0);
    const topReactions = reactionsAgg.slice(0, 3).map(r => ({
        reaction: r._id,
        count: r.count
    }));
    return { totalReactions, topReactions };
};
exports.getReactionsSummary = getReactionsSummary;
const getFeed = (0, express_async_handler_1.default)(async (req, res) => {
    const { feedId } = req.body;
    const currentUserId = req.userId;
    if (!feedId) {
        res.status(400).json({ success: false, message: "Feed ID is required" });
        return;
    }
    const feedAgg = await Post_1.default.aggregate([
        { $match: { _id: new mongoose_1.default.Types.ObjectId(feedId) } },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: "$user" },
        {
            $lookup: {
                from: "tags",
                localField: "tags",
                foreignField: "_id",
                as: "tags"
            }
        },
        {
            $lookup: {
                from: "posts",
                localField: "parentId",
                foreignField: "_id",
                as: "originalPost",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "users"
                        }
                    },
                    {
                        $lookup: {
                            from: "tags",
                            localField: "tags",
                            foreignField: "_id",
                            as: "tags"
                        }
                    },
                    { $limit: 1 }
                ]
            }
        }
    ]);
    if (!feedAgg.length) {
        res.status(404).json({ message: "Feed not found" });
        return;
    }
    const feed = feedAgg[0];
    const reactionsAgg = await Upvote_1.default.aggregate([
        { $match: { parentId: new mongoose_1.default.Types.ObjectId(feedId) } },
        {
            $group: {
                _id: "$reaction",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
    const totalReactions = reactionsAgg.reduce((sum, r) => sum + r.count, 0);
    const topReactions = reactionsAgg.slice(0, 3).map(r => ({
        reaction: r._id,
        count: r.count
    }));
    const attachments = await PostAttachment_1.default.getByPostId({ post: feedId });
    const data = {
        id: feed._id,
        type: feed._type,
        title: feed.title || null,
        message: feed.message,
        tags: feed.tags,
        date: feed.createdAt,
        userId: feed.user._id,
        userName: feed.user.name,
        userAvatarImage: feed.user.avatarImage,
        answers: feed.answers,
        votes: feed.votes,
        shares: feed.shares,
        level: feed.user.level,
        roles: feed.user.roles,
        isPinned: feed.isPinned,
        attachments,
        reaction: "",
        isUpvoted: false,
        originalPost: feed.originalPost.length
            ? {
                id: feed.originalPost[0]._id,
                title: feed.originalPost[0].title || null,
                message: feed.originalPost[0].message,
                tags: feed.originalPost[0].tags,
                userId: feed.originalPost[0].user,
                userName: feed.originalPost[0].users.length
                    ? feed.originalPost[0].users[0].name
                    : "Unknown User",
                userAvatarImage: feed.originalPost[0].users.length
                    ? feed.originalPost[0].users[0].avatarImage || null
                    : null,
                date: feed.originalPost[0].createdAt
            }
            : null,
        totalReactions,
        topReactions
    };
    if (currentUserId) {
        const upvote = await Upvote_1.default.findOne({ parentId: data.id, user: currentUserId });
        data.isUpvoted = !!upvote;
        data.reaction = upvote?.reaction ?? "";
    }
    res.status(200).json({ feed: data, success: true });
});
const getReplies = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { feedId, parentId, index, count, filter, findPostId } = req.body;
    if (typeof filter === "undefined" || typeof index !== "number" || index < 0 || typeof count !== "number" || count < 1 || count > 100) {
        res.status(400).json({ message: "Some fileds are missing" });
        return;
    }
    let parentPost = null;
    if (parentId) {
        parentPost = await Post_1.default
            .findById(parentId)
            .populate("user", "name avatarImage countryCode level roles");
    }
    let dbQuery = Post_1.default.find({ feedId, _type: PostTypeEnum_1.default.FEED_COMMENT, hidden: false });
    let skipCount = index;
    if (findPostId) {
        const reply = await Post_1.default.findById(findPostId);
        if (reply === null) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        parentPost = reply.parentId ? await Post_1.default
            .findById(reply.parentId)
            .populate("user", "name avatarImage countryCode level roles")
            :
                null;
        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });
        skipCount = Math.max(0, (await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()));
        dbQuery = dbQuery
            .sort({ createdAt: "asc" });
    }
    else {
        dbQuery = dbQuery.where({ parentId });
        switch (filter) {
            // Most popular
            case 1: {
                dbQuery = dbQuery
                    .sort({ votes: "desc", createdAt: "desc" });
                break;
            }
            // Oldest first
            case 2: {
                dbQuery = dbQuery
                    .sort({ createdAt: "asc" });
                break;
            }
            // Newest first
            case 3: {
                dbQuery = dbQuery
                    .sort({ createdAt: "desc" });
                break;
            }
            default:
                throw new Error("Unknown filter");
        }
    }
    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles");
    if (result) {
        const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
            id: x._id,
            parentId: x.parentId,
            message: x.message,
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            level: x.user.level,
            roles: x.user.roles,
            votes: x.votes,
            isUpvoted: false,
            answers: x.answers,
            index: (findPostId && parentPost) ?
                offset === 0 ? -1 : skipCount + offset - 1 :
                skipCount + offset,
            attachments: new Array()
        }));
        let promises = [];
        for (let i = 0; i < data.length; ++i) {
            /*promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].votes = count;
            }));*/
            if (currentUserId) {
                promises.push(Upvote_1.default.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                    data[i].isUpvoted = !(upvote === null);
                }));
            }
            promises.push(PostAttachment_1.default.getByPostId({ post: data[i].id }).then(attachments => data[i].attachments = attachments));
        }
        await Promise.all(promises);
        res.status(200).json({ posts: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
});
const togglePinFeed = (0, express_async_handler_1.default)(async (req, res) => {
    const { feedId } = req.body;
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';
    if (!feedId) {
        res.status(400).json({ success: false, message: "Feed ID is required" });
        return;
    }
    const feed = await Post_1.default.findById(feedId);
    if (feed === null) {
        res.status(404).json({ success: false, message: "Feed not found" });
        return;
    }
    if (currentUserId != feed.user) {
        await Notification_1.default.create({
            _type: NotificationTypeEnum_1.default.FEED_PIN,
            user: feed.user,
            actionUser: currentUserId,
            message: `{action_user} pinned your Post "${(0, StringUtils_1.truncate)(feed.message, 20)}"`,
            feedId: feed._id,
        });
    }
    feed.isPinned = !feed.isPinned;
    await feed.save();
    res.status(200).json({ success: true });
});
const getPinnedFeeds = (0, express_async_handler_1.default)(async (req, res) => {
    // const currentUserId = req.userId;
    const currentUserId = '68a7400f3dd5eef60a166911';
    if (!currentUserId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    const pinnedFeeds = await Post_1.default.find({ user: currentUserId, isPinned: true });
    res.status(200).json({ pinnedFeeds, success: true });
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
    getPinnedFeeds,
    votePost,
    getReactions
};
exports.default = feedController;
