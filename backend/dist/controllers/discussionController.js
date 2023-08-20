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
    const query = req.query;
    const currentUserId = req.userId;
    const page = Number(query.page);
    const count = Number(query.count);
    const filter = Number(query.filter);
    const searchQuery = typeof query.query !== "string" ? "" : query.query.trim();
    const userId = typeof query.profileId !== "string" ? null : query.profileId;
    if (!Number.isInteger(page) || !Number.isInteger(count) || !Number.isInteger(filter)) {
        res.status(400).json({ message: "Invalid query params" });
        return;
    }
    let dbQuery = Post_1.default.find({ _type: 1 });
    if (searchQuery.length) {
        const tagIds = (yield Tag_1.default.find({ name: searchQuery }))
            .map(x => x._id);
        dbQuery.where({
            $or: [
                { title: new RegExp("^" + searchQuery, "i") },
                { "tags": { $in: tagIds } }
            ]
        });
    }
    switch (filter) {
        // Most Recent
        case 1: {
            dbQuery = dbQuery
                .sort({ createdAt: "desc" });
            break;
        }
        // Unanswered
        case 2: {
            dbQuery = dbQuery
                .where({ answers: 0 })
                .sort({ createdAt: "desc" });
            break;
        }
        // My Questions
        case 3: {
            if (userId === null) {
                res.status(400).json({ message: "Invalid query params" });
                return;
            }
            dbQuery = dbQuery
                .where({ user: userId })
                .sort({ createdAt: "desc" });
            break;
        }
        // My Replies
        case 4: {
            if (userId === null) {
                res.status(400).json({ message: "Invalid query params" });
                return;
            }
            const replies = yield Post_1.default.find({ user: userId, _type: 2 }).select("parentId");
            const questionIds = [...new Set(replies.map(x => x.parentId))];
            dbQuery = dbQuery
                .where({ _id: { $in: questionIds } })
                .sort({ createdAt: "desc" });
            break;
        }
        // Hot Today
        case 5: {
            let dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            dbQuery = dbQuery
                .where({ createdAt: { $gt: dayAgo } })
                .sort({ votes: "desc" });
            break;
        }
        default:
            throw new Error("Unknown filter");
    }
    const questionCount = yield dbQuery.clone().countDocuments();
    const result = yield dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("tags", "name");
    if (result) {
        const data = result.map(x => ({
            id: x._id,
            title: x.title,
            message: x.message,
            tags: x.tags.map((y) => y.name),
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles,
            answers: x.answers,
            votes: x.votes,
            isUpvoted: false,
            isAccepted: x.isAccepted
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
        res.json({ count: questionCount, questions: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
}));
const getQuestion = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const questionId = req.params.questionId;
    const question = yield Post_1.default.findById(questionId)
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("tags", "name");
    if (question) {
        //const answers = await Post.countDocuments({ parentId: questionId });
        //const votes = await Upvote.countDocuments({ parentId: questionId });
        const isUpvoted = currentUserId ? yield Upvote_1.default.findOne({ parentId: questionId, user: currentUserId }) : false;
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
                isAccepted: question.isAccepted
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
        question.answers += 1;
        yield question.save();
        res.json({
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                userId: reply.user,
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
const getReplies = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const query = req.query;
    const questionId = req.params.questionId;
    const page = Number(query.page);
    const count = Number(query.count);
    const filter = Number(query.filter);
    if (!Number.isInteger(page) || !Number.isInteger(count) || !Number.isInteger(filter)) {
        res.status(400).json({ message: "Invalid query params" });
        return;
    }
    let dbQuery = Post_1.default.find({ parentId: questionId, _type: 2 });
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
        default:
            throw new Error("Unknown filter");
    }
    const result = yield dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles");
    if (result) {
        const data = result.map(x => ({
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
            answers: x.answers
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
        }
        yield Promise.all(promises);
        res.json({ posts: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
}));
const getTags = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query } = req.query;
    if (typeof query !== "string") {
        res.status(400).json({ message: "Invalid query params" });
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
        yield Post_1.default.deleteOne({ _id: questionId });
        yield Post_1.default.deleteMany({ parentId: questionId });
        yield Upvote_1.default.deleteMany({ parentId: questionId });
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
        res.json({
            success: true,
            data: {
                id: reply._id,
                message: reply.message
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
        question.answers -= 1;
        yield question.save();
        yield Post_1.default.deleteOne({ _id: replyId });
        yield Post_1.default.deleteMany({ parentId: replyId });
        yield Upvote_1.default.deleteMany({ parentId: replyId });
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
            post.votes += 1;
        }
    }
    else if (vote === 0) {
        if (upvote) {
            yield Upvote_1.default.deleteOne({ _id: upvote._id });
            upvote = null;
            post.votes -= 1;
        }
    }
    yield post.save();
    res.json({ vote: upvote ? 1 : 0 });
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
    votePost
};
exports.default = discussController;
