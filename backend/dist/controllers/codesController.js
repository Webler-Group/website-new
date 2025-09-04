"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandlersWS = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Code_1 = __importDefault(require("../models/Code"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const templates_1 = __importDefault(require("../data/templates"));
const EvaluationJob_1 = __importDefault(require("../models/EvaluationJob"));
const socketServer_1 = require("../config/socketServer");
const regexUtils_1 = require("../utils/regexUtils");
const Post_1 = __importDefault(require("../models/Post"));
const PostAttachment_1 = __importDefault(require("../models/PostAttachment"));
const pushService_1 = require("../services/pushService");
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const RolesEnum_1 = __importDefault(require("../data/RolesEnum"));
const PostTypeEnum_1 = __importDefault(require("../data/PostTypeEnum"));
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const createCode = (0, express_async_handler_1.default)(async (req, res) => {
    const { name, language, source, cssSource, jsSource } = req.body;
    const currentUserId = req.userId;
    if (typeof name === "undefined" || typeof language === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    if (await Code_1.default.countDocuments({ user: currentUserId }) >= 500) {
        res.status(403).json({ message: "You already have max count of codes" });
        return;
    }
    const code = await Code_1.default.create({
        name,
        language,
        user: currentUserId,
        source,
        cssSource,
        jsSource
    });
    if (code) {
        res.json({
            code: {
                id: code._id,
                name: code.name,
                language: code.language,
                createdAt: code.createdAt,
                updatedAt: code.createdAt,
                userId: code.user,
                votes: code.votes,
                comments: code.comments,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource,
                isPublic: code.isPublic
            }
        });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
});
const getCodeList = (0, express_async_handler_1.default)(async (req, res) => {
    const { page, count, filter, searchQuery, userId, language } = req.body;
    const currentUserId = req.userId;
    if (typeof page !== "number" || page < 1 || typeof count !== "number" || count < 1 || count > 100 || typeof filter === "undefined" || typeof searchQuery === "undefined" || typeof userId === "undefined" || typeof language === "undefined") {
        res.status(400).json({ message: "Invalid body" });
        return;
    }
    const safeQuery = (0, regexUtils_1.escapeRegex)(searchQuery.trim());
    const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");
    let dbQuery = Code_1.default.find({ hidden: false });
    if (searchQuery.trim().length > 0) {
        dbQuery.where({
            $or: [
                { name: searchRegex }
            ]
        });
    }
    if (language !== "") {
        dbQuery.where({ language });
    }
    switch (filter) {
        // Most Recent
        case 1: {
            dbQuery = dbQuery
                .where({ isPublic: true })
                .sort({ createdAt: "desc" });
            break;
        }
        // Most popular
        case 2: {
            dbQuery = dbQuery
                .where({ isPublic: true })
                .sort({ votes: "desc" });
            break;
        }
        // My Codes
        case 3: {
            if (userId === null) {
                res.status(400).json({ message: "Invalid request" });
                return;
            }
            if (userId !== currentUserId) {
                dbQuery = dbQuery.where({ isPublic: true });
            }
            dbQuery = dbQuery
                .where({ user: userId })
                .sort({ updatedAt: "desc" });
            break;
        }
        // Hot Today
        case 5: {
            let dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            dbQuery = dbQuery
                .where({ createdAt: { $gt: dayAgo }, isPublic: true })
                .sort({ votes: "desc" });
            break;
        }
        default:
            throw new Error("Unknown filter");
    }
    const codeCount = await dbQuery.clone().countDocuments();
    const result = await dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .select("-source -cssSource -jsSource")
        .populate("user", "name avatarImage level roles");
    if (result) {
        const data = result.map(x => ({
            id: x._id,
            name: x.name,
            createdAt: x.createdAt,
            updatedAt: x.updatedAt,
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            level: x.user.level,
            roles: x.user.roles,
            comments: x.comments,
            votes: x.votes,
            isUpvoted: false,
            isPublic: x.isPublic,
            language: x.language
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
        res.status(200).json({ count: codeCount, codes: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
});
const getCode = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { codeId } = req.body;
    const code = await Code_1.default.findById(codeId)
        .populate("user", "name avatarImage countryCode level roles");
    if (code) {
        const isUpvoted = currentUserId ? await Upvote_1.default.findOne({ parentId: codeId, user: currentUserId }) : false;
        res.json({
            code: {
                id: code._id,
                name: code.name,
                language: code.language,
                createdAt: code.createdAt,
                updatedAt: code.updatedAt,
                userId: code.user._id,
                userName: code.user.name,
                userAvatar: code.user.avatarImage,
                level: code.user.level,
                roles: code.user.roles,
                comments: code.comments,
                votes: code.votes,
                isUpvoted,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource,
                isPublic: code.isPublic
            }
        });
    }
    else {
        res.status(404).json({ message: "Question not found" });
    }
});
const getTemplate = (0, express_async_handler_1.default)(async (req, res) => {
    const language = req.params.language;
    const template = templates_1.default.find(x => x.language === language);
    if (template) {
        res.json({
            template
        });
    }
    else {
        res.status(404).json({ message: "Unknown language" });
    }
});
const editCode = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { codeId, name, isPublic, source, cssSource, jsSource } = req.body;
    if (typeof name === "undefined" || typeof isPublic === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const code = await Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    if (currentUserId != code.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    code.name = name;
    code.isPublic = isPublic;
    code.source = source;
    code.cssSource = cssSource;
    code.jsSource = jsSource;
    try {
        await code.save();
        res.json({
            success: true,
            data: {
                id: code._id,
                name: code.name,
                isPublic: code.isPublic,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource,
                updatedAt: code.updatedAt
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
const deleteCode = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { codeId } = req.body;
    const code = await Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    if (currentUserId != code.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        await Code_1.default.deleteAndCleanup(codeId);
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
});
const voteCode = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { codeId, vote } = req.body;
    if (typeof vote === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const code = await Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    let upvote = await Upvote_1.default.findOne({ parentId: codeId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = await Upvote_1.default.create({ user: currentUserId, parentId: codeId });
            code.$inc("votes", 1);
            await code.save();
        }
    }
    else if (vote === 0) {
        if (upvote) {
            await Upvote_1.default.deleteOne({ _id: upvote._id });
            upvote = null;
            code.$inc("votes", -1);
            await code.save();
        }
    }
    res.json({ vote: upvote ? 1 : 0 });
});
const getCodeComments = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { codeId, parentId, index, count, filter, findPostId } = req.body;
    if (typeof filter !== "number" || typeof index !== "number" || index < 0 || typeof count !== "number" || count < 1 || count > 100) {
        res.status(400).json({ message: "Some fileds are missing" });
        return;
    }
    let parentPost = null;
    if (parentId) {
        parentPost = await Post_1.default
            .findById(parentId)
            .populate("user", "name avatarImage countryCode level roles");
    }
    let dbQuery = Post_1.default.find({ codeId, _type: PostTypeEnum_1.default.CODE_COMMENT, hidden: false });
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
        _type: PostTypeEnum_1.default.CODE_COMMENT,
        message,
        codeId,
        parentId,
        user: currentUserId
    });
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
            _type: NotificationTypeEnum_1.default.CODE_COMMENT,
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
            parentId: reply.parentId,
            votes: reply.votes,
            answers: reply.answers,
            attachments
        }
    });
});
const editCodeComment = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { id, message } = req.body;
    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const comment = await Post_1.default.findById(id);
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
    const { id } = req.body;
    const comment = await Post_1.default.findById(id);
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
        await Post_1.default.deleteAndCleanup({ _id: id });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
});
const createJob = (0, express_async_handler_1.default)(async (req, res) => {
    const { language, source, stdin } = req.body;
    const deviceId = req.deviceId;
    const job = await EvaluationJob_1.default.create({
        language,
        source,
        stdin,
        deviceId
    });
    res.json({
        jobId: job._id
    });
});
const getJob = (0, express_async_handler_1.default)(async (req, res) => {
    const { jobId } = req.body;
    const job = await EvaluationJob_1.default.findById(jobId).select("-source");
    if (!job) {
        res.status(404).json({ message: "Job does not exist" });
        return;
    }
    res.json({
        job: {
            id: job._id,
            deviceId: job.deviceId,
            status: job.status,
            language: job.language,
            stdin: job.stdin,
            stdout: job.stdout,
            stderr: job.stderr
        }
    });
});
const getJobWS = async (socket, payload) => {
    const { jobId } = payload;
    const job = await EvaluationJob_1.default.findById(jobId).select("-source");
    if (!job) {
        console.log("404 Job " + jobId + " not found");
        return;
    }
    console.log("Job " + jobId + " finished with status: " + job.status);
    socket.to((0, socketServer_1.devRoom)(job.deviceId)).emit("job:get", {
        job: {
            id: job._id,
            deviceId: job.deviceId,
            status: job.status,
            language: job.language,
            stdin: job.stdin,
            stdout: job.stdout,
            stderr: job.stderr
        }
    });
};
const registerHandlersWS = (socket) => {
    if (socket.data.roles && socket.data.roles.includes(RolesEnum_1.default.ADMIN)) {
        socket.on("job:finished", (payload) => getJobWS(socket, payload));
    }
};
exports.registerHandlersWS = registerHandlersWS;
const codesController = {
    createCode,
    getCodeList,
    getCode,
    getTemplate,
    editCode,
    deleteCode,
    voteCode,
    createJob,
    getJob,
    getCodeComments,
    createCodeComment,
    editCodeComment,
    deleteCodeComment
};
exports.default = codesController;
