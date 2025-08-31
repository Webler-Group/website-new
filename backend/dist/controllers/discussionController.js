"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Post_1 = __importDefault(require("../models/Post"));
const Tag_1 = __importDefault(require("../models/Tag"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const Code_1 = __importDefault(require("../models/Code"));
const PostFollowing_1 = __importDefault(require("../models/PostFollowing"));
const Notification_1 = __importDefault(require("../models/Notification"));
const mongoose_1 = __importDefault(require("mongoose"));
const PostAttachment_1 = __importDefault(require("../models/PostAttachment"));
const regexUtils_1 = require("../utils/regexUtils");
const pushService_1 = require("../services/pushService");
const User_1 = __importDefault(require("../models/User"));
const UserFollowing_1 = __importDefault(require("../models/UserFollowing"));
const createQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, message, tags } = req.body;
    const currentUserId = req.userId;
    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const tagIds = [];
    for (let tagName of tags) {
        const tag = await Tag_1.default.findOne({ name: tagName });
        if (!tag) {
            res.status(400).json({ message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }
    if (tagIds.length < 1) {
        res.status(400).json({ message: `Empty Tag` });
        return;
    }
    const question = await Post_1.default.create({
        _type: 1,
        title,
        message,
        tags: tagIds,
        user: currentUserId
    });
    if (question) {
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
    }
    else {
        res.status(500).json({ message: "Error" });
    }
});
const getQuestionList = (0, express_async_handler_1.default)(async (req, res) => {
    const { page, count, filter, searchQuery, userId } = req.body;
    const currentUserId = req.userId;
    if (typeof page !== "number" || page < 1 || typeof count !== "number" || count < 1 || count > 100 || typeof filter === "undefined" || typeof searchQuery === "undefined" || typeof userId === "undefined") {
        res.status(400).json({ message: "Invalid body" });
        return;
    }
    const safeQuery = (0, regexUtils_1.escapeRegex)(searchQuery.trim());
    const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");
    let pipeline = [
        { $match: { _type: 1, hidden: false } },
        {
            $set: {
                score: { $add: ["$votes", "$answers"] }
            }
        }
    ];
    let dbQuery = Post_1.default
        .find({
        _type: 1,
        hidden: false
    });
    if (searchQuery.trim().length > 0) {
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
            if (userId === null) {
                res.status(400).json({ message: "Invalid request" });
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
            if (userId === null) {
                res.status(400).json({ message: "Invalid request" });
                return;
            }
            const replies = await Post_1.default.find({ user: userId, _type: 2 }).select("parentId");
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
            throw new Error("Unknown filter");
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
    /*const result = await dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .select("-message")
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("tags", "name") as any[];*/
    const result = await Post_1.default.aggregate(pipeline);
    if (result) {
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
            /*promises.push(Post.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].answers = count;
            }));*/
            /*promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].votes = count;
            }));*/
            if (currentUserId) {
                promises.push(Upvote_1.default.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                    data[i].isUpvoted = !(upvote === null);
                }));
            }
        }
        await Promise.all(promises);
        res.status(200).json({ count: questionCount, questions: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
});
const getQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { questionId } = req.body;
    const question = await Post_1.default.findById(questionId)
        .populate("user", "name avatarImage countryCode level roles")
        .populate("tags", "name");
    if (question) {
        //const answers = await Post.countDocuments({ parentId: questionId });
        //const votes = await Upvote.countDocuments({ parentId: questionId });
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
        res.status(404).json({ message: "Question not found" });
    }
});
const createReply = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { message, questionId } = req.body;
    const question = await Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    const reply = await Post_1.default.create({
        _type: 2,
        message,
        parentId: questionId,
        user: currentUserId
    });
    if (reply) {
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
        const followers = new Set((await PostFollowing_1.default.find({ following: question._id })).map(x => x.user.toString()));
        followers.add(question.user.toString());
        followers.delete(currentUserId);
        const currentUserName = (await User_1.default.findById(currentUserId, "name")).name;
        await (0, pushService_1.sendToUsers)(Array.from(followers).filter(x => x !== question.user.toString()), {
            title: "New answer",
            body: `${currentUserName} posted in "${question.title}"`
        }, "discuss");
        await (0, pushService_1.sendToUsers)([question.user.toString()], {
            title: "New answer",
            body: `${currentUserName} answered your question "${question.title}"`
        }, "discuss");
        for (let userToNotify of followers) {
            await Notification_1.default.create({
                _type: 201,
                user: userToNotify,
                actionUser: currentUserId,
                message: userToNotify === question.user.toString() ?
                    `{action_user} answered your question "${question.title}"`
                    :
                        `{action_user} posted in "${question.title}"`,
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
    }
    else {
        res.status(500).json({ message: "error" });
    }
});
const getReplies = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { questionId, index, count, filter, findPostId } = req.body;
    if (typeof index !== "number" || index < 0 || typeof count !== "number" || count < 1 || count > 100 || typeof filter === "undefined" || typeof findPostId === "undefined") {
        res.status(400).json({ message: "Invalid body" });
        return;
    }
    let dbQuery = Post_1.default.find({ parentId: questionId, _type: 2, hidden: false });
    let skipCount = index;
    if (findPostId) {
        const reply = await Post_1.default.findById(findPostId);
        if (reply === null) {
            res.status(404).json({ message: "Post not found" });
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
                throw new Error("Unknown filter");
        }
    }
    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles");
    if (result) {
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
const getTags = (0, express_async_handler_1.default)(async (req, res) => {
    const { query } = req.body;
    if (typeof query === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    if (query.length < 1) {
        res.json({ tags: [] });
    }
    else {
        const result = await Tag_1.default.find({ name: new RegExp("^" + query) });
        res.json({
            tags: result.map(x => x.name)
        });
    }
});
const toggleAcceptedAnswer = (0, express_async_handler_1.default)(async (req, res) => {
    const { accepted, postId } = req.body;
    const post = await Post_1.default.findById(postId);
    if (post === null) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
    }
    const question = await Post_1.default.findById(post.parentId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
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
    const currentUserId = req.userId;
    const { questionId, title, message, tags } = req.body;
    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const question = await Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    if (question.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const tagIds = (await Tag_1.default.getOrCreateTagsByNames(tags)).map(x => x._id);
    question.title = title;
    question.message = message;
    question.tags = tagIds;
    try {
        await question.save();
        res.json({
            success: true,
            data: {
                id: question._id,
                title: question.title,
                message: question.message,
                tags: question.tags
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
});
const deleteQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { questionId } = req.body;
    const question = await Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    if (question.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        await Post_1.default.deleteAndCleanup({ _id: questionId });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
});
const editReply = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { replyId, message } = req.body;
    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const reply = await Post_1.default.findById(replyId);
    if (reply === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (currentUserId != reply.user) {
        res.status(401).json({ message: "Unauthorized" });
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
            error: err,
            data: null
        });
    }
});
const deleteReply = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { replyId } = req.body;
    const reply = await Post_1.default.findById(replyId);
    if (reply === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (currentUserId != reply.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const question = await Post_1.default.findById(reply.parentId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    try {
        await Post_1.default.deleteAndCleanup({ _id: replyId });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
});
const votePost = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { postId, vote } = req.body;
    if (typeof vote === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const post = await Post_1.default.findById(postId);
    if (post === null) {
        res.status(404).json({ message: "Post not found" });
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
    res.json({ vote: upvote ? 1 : 0 });
});
const getCodeComments = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { codeId, parentId, index, count, filter, findPostId } = req.body;
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
    let dbQuery = Post_1.default.find({ codeId, _type: 3, hidden: false });
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
            codeId: x.codeId,
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
const createCodeComment = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { codeId, message, parentId } = req.body;
    const code = await Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    let parentPost = null;
    if (parentId !== null) {
        parentPost = await Post_1.default.findById(parentId);
        if (parentPost === null) {
            res.status(404).json({ message: "Parent post not found" });
            return;
        }
    }
    const reply = await Post_1.default.create({
        _type: 3,
        message,
        codeId,
        parentId,
        user: currentUserId
    });
    if (reply) {
        const usersToNotify = new Set();
        usersToNotify.add(code.user.toString());
        if (parentPost !== null) {
            usersToNotify.add(parentPost.user.toString());
        }
        usersToNotify.delete(currentUserId);
        const currentUserName = (await User_1.default.findById(currentUserId, "name")).name;
        await (0, pushService_1.sendToUsers)(Array.from(usersToNotify).filter(x => x !== code.user.toString()), {
            title: "New reply",
            body: `${currentUserName} replied to your comment on "${code.name}"`
        }, "codes");
        await (0, pushService_1.sendToUsers)([code.user.toString()], {
            title: "New comment",
            body: `${currentUserName} posted comment on your code "${code.name}"`
        }, "codes");
        for (let userToNotify of usersToNotify) {
            await Notification_1.default.create({
                _type: 202,
                user: userToNotify,
                actionUser: currentUserId,
                message: userToNotify === code.user.toString() ?
                    `{action_user} posted comment on your code "${code.name}"`
                    :
                        `{action_user} replied to your comment on "${code.name}"`,
                codeId: code._id,
                postId: reply._id
            });
        }
        code.$inc("comments", 1);
        await code.save();
        if (parentPost) {
            parentPost.$inc("answers", 1);
            await parentPost.save();
        }
        const attachments = await PostAttachment_1.default.getByPostId({ post: reply._id });
        res.json({
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                userId: reply.user,
                codeId: reply.codeId,
                parentId: reply.parentId,
                isAccepted: reply.isAccepted,
                votes: reply.votes,
                answers: reply.answers,
                attachments
            }
        });
    }
    else {
        res.status(500).json({ message: "error" });
    }
});
const editCodeComment = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { commentId, message } = req.body;
    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const comment = await Post_1.default.findById(commentId);
    if (comment === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    comment.message = message;
    try {
        await comment.save();
        const attachments = await PostAttachment_1.default.getByPostId({ post: comment._id });
        res.json({
            success: true,
            data: {
                id: comment._id,
                message: comment.message,
                attachments
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
});
const deleteCodeComment = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { commentId } = req.body;
    const comment = await Post_1.default.findById(commentId);
    if (comment === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const code = await Code_1.default.findById(comment.codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    try {
        await Post_1.default.deleteAndCleanup({ _id: commentId });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
});
const followQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { postId } = req.body;
    if (typeof postId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const postExists = await Post_1.default.findOne({ _id: postId });
    if (!postExists) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (postExists._type !== 1) {
        res.status(405).json({ message: "Post is not a question" });
        return;
    }
    const exists = await PostFollowing_1.default.findOne({ user: currentUserId, following: postId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }
    const postFollowing = await PostFollowing_1.default.create({
        user: currentUserId,
        following: postId
    });
    if (postFollowing) {
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
});
const unfollowQuestion = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { postId } = req.body;
    if (typeof postId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const postExists = await Post_1.default.findOne({ _id: postId });
    if (!postExists) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (postExists._type !== 1) {
        res.status(405).json({ message: "Post is not a question" });
        return;
    }
    const postFollowing = await PostFollowing_1.default.findOne({ user: currentUserId, following: postId });
    if (postFollowing === null) {
        res.status(204).json({ success: true });
        return;
    }
    const result = await PostFollowing_1.default.deleteOne({ user: currentUserId, following: postId });
    if (result.deletedCount == 1) {
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
});
const getVotersList = (0, express_async_handler_1.default)(async (req, res) => {
    const { parentId, page, count } = req.body;
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
    getTags,
    toggleAcceptedAnswer,
    editQuestion,
    deleteQuestion,
    editReply,
    deleteReply,
    votePost,
    createCodeComment,
    getCodeComments,
    editCodeComment,
    deleteCodeComment,
    followQuestion,
    unfollowQuestion,
    getVotersList
};
exports.default = discussController;
