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
const Post_1 = __importDefault(require("../models/Post"));
const Tag_1 = __importDefault(require("../models/Tag"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const Code_1 = __importDefault(require("../models/Code"));
const PostFollowing_1 = __importDefault(require("../models/PostFollowing"));
const Notification_1 = __importDefault(require("../models/Notification"));
const mongoose_1 = __importDefault(require("mongoose"));
const PostAttachment_1 = __importDefault(require("../models/PostAttachment"));
const createQuestion = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, message, tags } = req.body;
    const currentUserId = req.userId;
    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const tagIds = [];
    let promises = [];
    for (let tagName of tags) {
        promises.push(Tag_1.default.getOrCreateTagByName(tagName)
            .then(tag => {
            tagIds.push(tag._id);
        }));
    }
    yield Promise.all(promises);
    const question = yield Post_1.default.create({
        _type: 1,
        title,
        message,
        tags: tagIds,
        user: currentUserId
    });
    if (question) {
        yield PostFollowing_1.default.create({
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
}));
const getQuestionList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, count, filter, searchQuery, userId } = req.body;
    const currentUserId = req.userId;
    if (typeof page === "undefined" || typeof count === "undefined" || typeof filter === "undefined" || typeof searchQuery === "undefined" || typeof userId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
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
    if (searchQuery.trim().length) {
        const tagIds = (yield Tag_1.default.find({ name: searchQuery.trim() }))
            .map(x => x._id);
        pipeline.push({
            $match: {
                $or: [
                    { title: new RegExp("^" + searchQuery.trim(), "i") },
                    { "tags": { $in: tagIds } }
                ]
            }
        });
        dbQuery.where({
            $or: [
                { title: new RegExp("^" + searchQuery.trim(), "i") },
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
            const replies = yield Post_1.default.find({ user: userId, _type: 2 }).select("parentId");
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
    const questionCount = yield dbQuery.clone().countDocuments();
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
    const result = yield Post_1.default.aggregate(pipeline);
    if (result) {
        const data = result.map(x => ({
            id: x._id,
            title: x.title,
            tags: x.tags.map((y) => y.name),
            date: x.createdAt,
            userId: x.user._id,
            userName: x.users.length ? x.users[0].name : undefined,
            avatarUrl: x.users.length ? x.users[0].avatarUrl : undefined,
            countryCode: x.users.length ? x.users[0].countryCode : undefined,
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
        yield Promise.all(promises);
        res.status(200).json({ count: questionCount, questions: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
}));
const getQuestion = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { questionId } = req.body;
    const question = yield Post_1.default.findById(questionId)
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("tags", "name");
    if (question) {
        //const answers = await Post.countDocuments({ parentId: questionId });
        //const votes = await Upvote.countDocuments({ parentId: questionId });
        const isUpvoted = currentUserId ? (yield Upvote_1.default.findOne({ parentId: questionId, user: currentUserId })) !== null : false;
        const isFollowed = currentUserId ? (yield PostFollowing_1.default.findOne({ user: currentUserId, following: questionId })) !== null : false;
        const attachments = yield PostAttachment_1.default.getByPostId(questionId);
        res.json({
            question: {
                id: question._id,
                title: question.title,
                message: question.message,
                tags: question.tags.map((y) => y.name),
                date: question.createdAt,
                userId: question.user._id,
                userName: question.user.name,
                avatarUrl: question.user.avatarUrl,
                countryCode: question.user.countryCode,
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
}));
const createReply = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { message, questionId } = req.body;
    const question = yield Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    const reply = yield Post_1.default.create({
        _type: 2,
        message,
        parentId: questionId,
        user: currentUserId
    });
    if (reply) {
        const questionFollowed = yield PostFollowing_1.default.findOne({
            user: currentUserId,
            following: question._id
        });
        if (questionFollowed === null) {
            yield PostFollowing_1.default.create({
                user: currentUserId,
                following: question._id
            });
        }
        const followers = new Set((yield PostFollowing_1.default.find({ following: question._id })).map(x => x.user.toString()));
        followers.add(question.user.toString());
        followers.delete(currentUserId);
        for (let userToNotify of followers) {
            yield Notification_1.default.create({
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
        yield question.save();
        const attachments = yield PostAttachment_1.default.getByPostId(reply._id.toString());
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
}));
const getReplies = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { questionId, index, count, filter, findPostId } = req.body;
    if (typeof index === "undefined" || typeof count === "undefined" || typeof filter === "undefined" || typeof findPostId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    let dbQuery = Post_1.default.find({ parentId: questionId, _type: 2, hidden: false });
    let skipCount = index;
    if (findPostId) {
        const reply = yield Post_1.default.findById(findPostId);
        if (reply === null) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        skipCount = Math.floor((yield dbQuery
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
    const result = yield dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles");
    if (result) {
        const data = result.map((x, offset) => ({
            id: x._id,
            parentId: x.parentId,
            message: x.message,
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
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
            promises.push(PostAttachment_1.default.getByPostId(data[i].id).then(attachments => data[i].attachments = attachments));
        }
        yield Promise.all(promises);
        res.status(200).json({ posts: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
}));
const getTags = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req.body;
    if (typeof query === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    if (query.length < 3) {
        res.json({ tags: [] });
    }
    else {
        const result = yield Tag_1.default.find({ name: new RegExp("^" + query) });
        res.json({
            tags: result.map(x => x.name)
        });
    }
}));
const toggleAcceptedAnswer = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accepted, postId } = req.body;
    const post = yield Post_1.default.findById(postId);
    if (post === null) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
    }
    const question = yield Post_1.default.findById(post.parentId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    if (accepted || post.isAccepted) {
        question.isAccepted = accepted;
        yield question.save();
    }
    post.isAccepted = accepted;
    yield post.save();
    if (accepted) {
        const currentAcceptedPost = yield Post_1.default.findOne({ parentId: post.parentId, isAccepted: true, _id: { $ne: postId } });
        if (currentAcceptedPost) {
            currentAcceptedPost.isAccepted = false;
            yield currentAcceptedPost.save();
        }
    }
    res.json({
        success: true,
        accepted
    });
}));
const editQuestion = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { questionId, title, message, tags } = req.body;
    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const question = yield Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    if (question.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const tagIds = [];
    let promises = [];
    for (let tagName of tags) {
        promises.push(Tag_1.default.getOrCreateTagByName(tagName)
            .then(tag => {
            tagIds.push(tag._id);
        }));
    }
    yield Promise.all(promises);
    question.title = title;
    question.message = message;
    question.tags = tagIds;
    try {
        yield question.save();
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
}));
const deleteQuestion = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { questionId } = req.body;
    const question = yield Post_1.default.findById(questionId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    if (question.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        yield Post_1.default.deleteAndCleanup({ _id: questionId });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
}));
const editReply = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { replyId, message } = req.body;
    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const reply = yield Post_1.default.findById(replyId);
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
        yield reply.save();
        const attachments = yield PostAttachment_1.default.getByPostId(reply._id.toString());
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
}));
const deleteReply = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { replyId } = req.body;
    const reply = yield Post_1.default.findById(replyId);
    if (reply === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (currentUserId != reply.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const question = yield Post_1.default.findById(reply.parentId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return;
    }
    try {
        yield Post_1.default.deleteAndCleanup({ _id: replyId });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
}));
const votePost = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { postId, vote } = req.body;
    if (typeof vote === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const post = yield Post_1.default.findById(postId);
    if (post === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    let upvote = yield Upvote_1.default.findOne({ parentId: postId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = yield Upvote_1.default.create({ user: currentUserId, parentId: postId });
            post.$inc("votes", 1);
            yield post.save();
        }
    }
    else if (vote === 0) {
        if (upvote) {
            yield Upvote_1.default.deleteOne({ _id: upvote._id });
            upvote = null;
            post.$inc("votes", -1);
            yield post.save();
        }
    }
    res.json({ vote: upvote ? 1 : 0 });
}));
const getCodeComments = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId, parentId, index, count, filter, findPostId } = req.body;
    if (typeof filter === "undefined" || typeof index === "undefined" || typeof count === "undefined") {
        res.status(400).json({ message: "Some fileds are missing" });
        return;
    }
    let parentPost = null;
    if (parentId) {
        parentPost = yield Post_1.default
            .findById(parentId)
            .populate("user", "name avatarUrl countryCode level roles");
    }
    let dbQuery = Post_1.default.find({ codeId, _type: 3, hidden: false });
    let skipCount = index;
    if (findPostId) {
        const reply = yield Post_1.default.findById(findPostId);
        if (reply === null) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        parentPost = reply.parentId ? yield Post_1.default
            .findById(reply.parentId)
            .populate("user", "name avatarUrl countryCode level roles")
            :
                null;
        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });
        skipCount = Math.max(0, (yield dbQuery
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
    const result = yield dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles");
    if (result) {
        const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
            id: x._id,
            parentId: x.parentId,
            codeId: x.codeId,
            message: x.message,
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
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
            promises.push(PostAttachment_1.default.getByPostId(data[i].id).then(attachments => data[i].attachments = attachments));
        }
        yield Promise.all(promises);
        res.status(200).json({ posts: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
}));
const createCodeComment = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId, message, parentId } = req.body;
    const code = yield Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    let parentPost = null;
    if (parentId !== null) {
        parentPost = yield Post_1.default.findById(parentId);
        if (parentPost === null) {
            res.status(404).json({ message: "Parent post not found" });
            return;
        }
    }
    const reply = yield Post_1.default.create({
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
        for (let userToNotify of usersToNotify) {
            yield Notification_1.default.create({
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
        yield code.save();
        if (parentPost) {
            parentPost.$inc("answers", 1);
            yield parentPost.save();
        }
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
                answers: reply.answers
            }
        });
    }
    else {
        res.status(500).json({ message: "error" });
    }
}));
const editCodeComment = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { commentId, message } = req.body;
    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    console.log("editCodeComment");
    const comment = yield Post_1.default.findById(commentId);
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
        yield comment.save();
        res.json({
            success: true,
            data: {
                id: comment._id,
                message: comment.message
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
}));
const deleteCodeComment = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { commentId } = req.body;
    const comment = yield Post_1.default.findById(commentId);
    if (comment === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const code = yield Code_1.default.findById(comment.codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    try {
        yield Post_1.default.deleteAndCleanup({ _id: commentId });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
}));
const followQuestion = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { postId } = req.body;
    if (typeof postId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const postExists = yield Post_1.default.findOne({ _id: postId });
    if (!postExists) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (postExists._type !== 1) {
        res.status(405).json({ message: "Post is not a question" });
        return;
    }
    const exists = yield PostFollowing_1.default.findOne({ user: currentUserId, following: postId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }
    const postFollowing = yield PostFollowing_1.default.create({
        user: currentUserId,
        following: postId
    });
    if (postFollowing) {
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
}));
const unfollowQuestion = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { postId } = req.body;
    if (typeof postId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const postExists = yield Post_1.default.findOne({ _id: postId });
    if (!postExists) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (postExists._type !== 1) {
        res.status(405).json({ message: "Post is not a question" });
        return;
    }
    const postFollowing = yield PostFollowing_1.default.findOne({ user: currentUserId, following: postId });
    if (postFollowing === null) {
        res.status(204).json({ success: true });
        return;
    }
    const result = yield PostFollowing_1.default.deleteOne({ user: currentUserId, following: postId });
    if (result.deletedCount == 1) {
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
}));
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
    unfollowQuestion
};
exports.default = discussController;
