"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Post_1 = __importDefault(require("../models/Post"));
const Tag_1 = __importDefault(require("../models/Tag"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const PostFollowing_1 = __importDefault(require("../models/PostFollowing"));
const Notification_1 = __importDefault(require("../models/Notification"));
const mongoose_1 = __importDefault(require("mongoose"));
const PostAttachment_1 = __importDefault(require("../models/PostAttachment"));
const regexUtils_1 = require("../utils/regexUtils");
const UserFollowing_1 = __importDefault(require("../models/UserFollowing"));
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const PostTypeEnum_1 = __importDefault(require("../data/PostTypeEnum"));
const zodUtils_1 = require("../utils/zodUtils");
const discussionSchema_1 = require("../validation/discussionSchema");
const createQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.createQuestionSchema, req);
    const { title, message, tags } = body;
    const currentUserId = req.userId;
    const tagIds = [];
    for (let tagName of tags) {
        const tag = await Tag_1.default.findOne({ name: tagName });
        if (tag) {
            tagIds.push(tag._id);
        }
    }
    const question = await Post_1.default.create({
        _type: PostTypeEnum_1.default.QUESTION,
        title,
        message,
        tags: tagIds,
        user: currentUserId
    });
    await PostFollowing_1.default.create({
        user: currentUserId,
        following: question._id
    });
    res.json({
        question: {
            id: question._id,
            title: question.title,
            message: question.message,
            tags: question.tags,
            date: question.createdAt,
            userId: question.user,
            isAccepted: question.isAccepted,
            votes: question.votes,
            answers: question.answers
        }
    });
});
const getQuestionList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.getQuestionListSchema, req);
    const { page, count, filter, searchQuery, userId } = body;
    const currentUserId = req.userId;
    let pipeline = [
        { $match: { _type: PostTypeEnum_1.default.QUESTION, hidden: false } },
        {
            $set: {
                score: { $add: ["$votes", "$answers"] }
            }
        }
    ];
    let dbQuery = Post_1.default
        .find({
        _type: PostTypeEnum_1.default.QUESTION,
        hidden: false
    });
    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = (0, regexUtils_1.escapeRegex)(searchQuery.trim());
        const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");
        const tagIds = (await Tag_1.default.find({ name: searchQuery.trim() }))
            .map(x => x._id);
        pipeline.push({
            $match: {
                $or: [
                    { title: searchRegex },
                    { "tags": { $in: tagIds } }
                ]
            }
        });
        dbQuery.where({
            $or: [
                { title: searchRegex },
                { "tags": { $in: tagIds } }
            ]
        });
    }
    switch (filter) {
        // Most Recent
        case 1: {
            pipeline.push({
                $sort: { createdAt: -1 }
            });
            dbQuery = dbQuery
                .sort({ createdAt: "desc" });
            break;
        }
        // Unanswered
        case 2: {
            pipeline.push({
                $match: { answers: 0 }
            }, {
                $sort: { createdAt: -1 }
            });
            dbQuery = dbQuery
                .where({ answers: 0 })
                .sort({ createdAt: "desc" });
            break;
        }
        // My Questions
        case 3: {
            if (!userId) {
                res.status(400).json({ error: [{ message: "Invalid request" }] });
                return;
            }
            pipeline.push({
                $match: { user: new mongoose_1.default.Types.ObjectId(userId) }
            }, {
                $sort: { createdAt: -1 }
            });
            dbQuery = dbQuery
                .where({ user: userId })
                .sort({ createdAt: "desc" });
            break;
        }
        // My Replies
        case 4: {
            if (!userId) {
                res.status(400).json({ error: [{ message: "Invalid request" }] });
                return;
            }
            const replies = await Post_1.default.find({ user: userId, _type: PostTypeEnum_1.default.ANSWER }).select("parentId");
            const questionIds = [...new Set(replies.map(x => x.parentId))];
            pipeline.push({
                $match: { _id: { $in: questionIds } }
            }, {
                $sort: { createdAt: -1 }
            });
            dbQuery = dbQuery
                .where({ _id: { $in: questionIds } })
                .sort({ createdAt: "desc" });
            break;
        }
        // Hot Today
        case 5: {
            let dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            pipeline.push({
                $match: { createdAt: { $gt: dayAgo } }
            }, {
                $sort: { score: -1 }
            });
            dbQuery = dbQuery
                .where({ createdAt: { $gt: dayAgo } })
                .sort({ votes: "desc" });
            break;
        }
        // Trending
        case 6: {
            pipeline.push({
                $sort: { score: -1 }
            });
            dbQuery = dbQuery
                .sort({ votes: "desc" });
            break;
        }
        default:
            res.status(400).json({ error: [{ message: "Unknown filter" }] });
            return;
    }
    const questionCount = await dbQuery.clone().countDocuments();
    pipeline.push({
        $skip: (page - 1) * count
    }, {
        $limit: count
    }, {
        $project: { message: 0 }
    }, {
        $lookup: { from: "users", localField: "user", foreignField: "_id", as: "users" }
    }, {
        $lookup: { from: "tags", localField: "tags", foreignField: "_id", as: "tags" }
    });
    const result = await Post_1.default.aggregate(pipeline);
    const data = result.map(x => ({
        id: x._id,
        title: x.title,
        tags: x.tags.map((y) => y.name),
        date: x.createdAt,
        userId: x.user._id,
        userName: x.users.length ? x.users[0].name : undefined,
        userAvatar: x.users.length ? x.users[0].avatarImage : undefined,
        level: x.users.length ? x.users[0].level : undefined,
        roles: x.users.length ? x.users[0].roles : undefined,
        answers: x.answers,
        votes: x.votes,
        isUpvoted: false,
        isAccepted: x.isAccepted,
        score: x.score
    }));
    let promises = [];
    for (let i = 0; i < data.length; ++i) {
        if (currentUserId) {
            promises.push(Upvote_1.default.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                data[i].isUpvoted = !(upvote === null);
            }));
        }
    }
    await Promise.all(promises);
    res.status(200).json({ count: questionCount, questions: data });
});
const getQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.getQuestionSchema, req);
    const { questionId } = body;
    const currentUserId = req.userId;
    const question = await Post_1.default.findById(questionId)
        .populate("user", "name avatarImage countryCode level roles")
        .populate("tags", "name")
        .lean();
    if (question) {
        const isUpvoted = currentUserId ? (await Upvote_1.default.findOne({ parentId: questionId, user: currentUserId })) !== null : false;
        const isFollowed = currentUserId ? (await PostFollowing_1.default.findOne({ user: currentUserId, following: questionId })) !== null : false;
        const attachments = await PostAttachment_1.default.getByPostId({ post: questionId });
        res.json({
            question: {
                id: question._id,
                title: question.title,
                message: question.message,
                tags: question.tags.map((y) => y.name),
                date: question.createdAt,
                userId: question.user._id,
                userName: question.user.name,
                userAvatar: question.user.avatarImage,
                level: question.user.level,
                roles: question.user.roles,
                answers: question.answers,
                votes: question.votes,
                isUpvoted,
                isAccepted: question.isAccepted,
                isFollowed,
                attachments
            }
        });
    }
    else {
        res.status(404).json({ error: [{ message: "Question not found" }] });
    }
});
const createReply = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.createReplySchema, req);
    const { message, questionId } = body;
    const currentUserId = req.userId;
    const question = await Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }
    const reply = await Post_1.default.create({
        _type: PostTypeEnum_1.default.ANSWER,
        message,
        parentId: questionId,
        user: currentUserId
    });
    const questionFollowed = await PostFollowing_1.default.findOne({
        user: currentUserId,
        following: question._id
    });
    if (questionFollowed === null) {
        await PostFollowing_1.default.create({
            user: currentUserId,
            following: question._id
        });
    }
    const followers = await PostFollowing_1.default.find({ following: question._id });
    await Notification_1.default.sendToUsers(followers.filter(x => x.user != currentUserId).map(x => x.user), {
        title: "New answer",
        type: NotificationTypeEnum_1.default.QA_ANSWER,
        actionUser: currentUserId,
        message: `{action_user} posted in "${question.title}"`,
        questionId: question._id,
        postId: reply._id
    });
    if (question.user != currentUserId) {
        await Notification_1.default.sendToUsers([question.user], {
            title: "New answer",
            type: NotificationTypeEnum_1.default.QA_ANSWER,
            actionUser: currentUserId,
            message: `{action_user} answered your question "${question.title}"`,
            questionId: question._id,
            postId: reply._id
        });
    }
    question.$inc("answers", 1);
    await question.save();
    const attachments = await PostAttachment_1.default.getByPostId({ post: reply._id });
    res.json({
        post: {
            id: reply._id,
            message: reply.message,
            date: reply.createdAt,
            userId: reply.user,
            parentId: reply.parentId,
            isAccepted: reply.isAccepted,
            votes: reply.votes,
            answers: reply.answers,
            attachments
        }
    });
});
const getReplies = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.getRepliesSchema, req);
    const { questionId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;
    let dbQuery = Post_1.default.find({ parentId: questionId, _type: PostTypeEnum_1.default.ANSWER, hidden: false });
    let skipCount = index;
    if (findPostId) {
        const reply = await Post_1.default.findById(findPostId);
        if (reply === null) {
            res.status(404).json({ error: [{ message: "Post not found" }] });
            return;
        }
        skipCount = Math.floor((await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()) / count) * count;
        dbQuery = dbQuery
            .sort({ createdAt: "asc" });
    }
    else {
        switch (filter) {
            // Most popular
            case 1: {
                dbQuery = dbQuery
                    .sort({ votes: "desc" });
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
                res.status(400).json({ error: [{ message: "Unknown filter" }] });
                return;
        }
    }
    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles");
    const data = result.map((x, offset) => ({
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
        isAccepted: x.isAccepted,
        answers: x.answers,
        index: skipCount + offset,
        attachments: new Array()
    }));
    let promises = [];
    for (let i = 0; i < data.length; ++i) {
        if (currentUserId) {
            promises.push(Upvote_1.default.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                data[i].isUpvoted = !(upvote === null);
            }));
        }
        promises.push(PostAttachment_1.default.getByPostId({ post: data[i].id }).then(attachments => data[i].attachments = attachments));
    }
    await Promise.all(promises);
    res.status(200).json({ posts: data });
});
const toggleAcceptedAnswer = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.toggleAcceptedAnswerSchema, req);
    const { accepted, postId } = body;
    const currentUserId = req.userId;
    const post = await Post_1.default.findById(postId);
    if (post === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }
    const question = await Post_1.default.findById(post.parentId);
    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }
    if (question.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    if (accepted || post.isAccepted) {
        question.isAccepted = accepted;
        await question.save();
    }
    post.isAccepted = accepted;
    await post.save();
    if (accepted) {
        const currentAcceptedPost = await Post_1.default.findOne({ parentId: post.parentId, isAccepted: true, _id: { $ne: postId } });
        if (currentAcceptedPost) {
            currentAcceptedPost.isAccepted = false;
            await currentAcceptedPost.save();
        }
    }
    res.json({
        success: true,
        accepted
    });
});
const editQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.editQuestionSchema, req);
    const { questionId, title, message, tags } = body;
    const currentUserId = req.userId;
    const question = await Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }
    if (question.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    const tagIds = (await Tag_1.default.getOrCreateTagsByNames(tags)).map(x => x._id);
    question.title = title;
    question.message = message;
    question.tags = tagIds;
    await question.save();
    const attachments = await PostAttachment_1.default.getByPostId({ post: question._id });
    res.json({
        success: true,
        data: {
            id: question._id,
            title: question.title,
            message: question.message,
            tags: question.tags,
            attachments
        }
    });
});
const deleteQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.deleteQuestionSchema, req);
    const { questionId } = body;
    const currentUserId = req.userId;
    const question = await Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }
    if (question.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    await Post_1.default.deleteAndCleanup({ _id: questionId });
    res.json({ success: true });
});
const editReply = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.editReplySchema, req);
    const { replyId, message } = body;
    const currentUserId = req.userId;
    const reply = await Post_1.default.findById(replyId);
    if (reply === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }
    if (currentUserId != reply.user) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    reply.message = message;
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
});
const deleteReply = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.deleteReplySchema, req);
    const { replyId } = body;
    const currentUserId = req.userId;
    const reply = await Post_1.default.findById(replyId);
    if (reply === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }
    if (currentUserId != reply.user) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    const question = await Post_1.default.findById(reply.parentId);
    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }
    await Post_1.default.deleteAndCleanup({ _id: replyId });
    res.json({ success: true });
});
const votePost = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.votePostSchema, req);
    const { postId, vote } = body;
    const currentUserId = req.userId;
    const post = await Post_1.default.findById(postId);
    if (post === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }
    let upvote = await Upvote_1.default.findOne({ parentId: postId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = await Upvote_1.default.create({ user: currentUserId, parentId: postId });
            post.$inc("votes", 1);
            await post.save();
        }
    }
    else if (vote === 0) {
        if (upvote) {
            await Upvote_1.default.deleteOne({ _id: upvote._id });
            upvote = null;
            post.$inc("votes", -1);
            await post.save();
        }
    }
    res.json({ success: true, vote: upvote ? 1 : 0 });
});
const followQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.followQuestionSchema, req);
    const { postId } = body;
    const currentUserId = req.userId;
    const postExists = await Post_1.default.exists({ _id: postId, _type: PostTypeEnum_1.default.QUESTION });
    if (!postExists) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }
    const exists = await PostFollowing_1.default.exists({ user: currentUserId, following: postId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }
    await PostFollowing_1.default.create({
        user: currentUserId,
        following: postId
    });
    res.json({ success: true });
});
const unfollowQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.unfollowQuestionSchema, req);
    const { postId } = body;
    const currentUserId = req.userId;
    const postExists = await Post_1.default.exists({ _id: postId, _type: PostTypeEnum_1.default.QUESTION });
    if (!postExists) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }
    const postFollowing = await PostFollowing_1.default.exists({ user: currentUserId, following: postId });
    if (postFollowing === null) {
        res.status(204).json({ success: true });
        return;
    }
    await PostFollowing_1.default.deleteOne({ user: currentUserId, following: postId });
    res.json({ success: true });
});
const getVotersList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(discussionSchema_1.getVotersListSchema, req);
    const { parentId, page, count } = body;
    const currentUserId = req.userId;
    const result = await Upvote_1.default.find({ parentId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles")
        .select("user");
    const promises = [];
    const data = result.map(x => ({
        id: x.user._id,
        name: x.user.name,
        avatar: x.user.avatarImage,
        countryCode: x.user.countryCode,
        level: x.user.level,
        roles: x.user.roles,
        isFollowing: false
    }));
    for (let i = 0; i < data.length; ++i) {
        const user = data[i];
        promises.push(UserFollowing_1.default.countDocuments({ user: currentUserId, following: user.id })
            .then(exists => {
            data[i].isFollowing = exists !== null;
        }));
    }
    await Promise.all(promises);
    res.json({
        success: true,
        data
    });
});
const discussController = {
    createQuestion,
    getQuestionList,
    getQuestion,
    createReply,
    getReplies,
    toggleAcceptedAnswer,
    editQuestion,
    deleteQuestion,
    editReply,
    deleteReply,
    votePost,
    followQuestion,
    unfollowQuestion,
    getVotersList
};
exports.default = discussController;
