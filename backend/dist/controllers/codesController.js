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
const Code_1 = __importDefault(require("../models/Code"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const templates_1 = __importDefault(require("../data/templates"));
const EvaluationJob_1 = __importDefault(require("../models/EvaluationJob"));
const createCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, language, source, cssSource, jsSource } = req.body;
    const currentUserId = req.userId;
    if (typeof name === "undefined" || typeof language === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    if ((yield Code_1.default.countDocuments({ user: currentUserId })) >= 500) {
        res.status(403).json({ message: "You already have max count of codes" });
        return;
    }
    const code = yield Code_1.default.create({
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
}));
const getCodeList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, count, filter, searchQuery, userId, language } = req.body;
    const currentUserId = req.userId;
    if (typeof page === "undefined" || typeof count === "undefined" || typeof filter === "undefined" || typeof searchQuery === "undefined" || typeof userId === "undefined" || typeof language === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    let dbQuery = Code_1.default.find({ hidden: false });
    if (searchQuery.trim().length) {
        dbQuery.where({
            $or: [
                { name: new RegExp("^" + searchQuery.trim(), "i") }
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
    const codeCount = yield dbQuery.clone().countDocuments();
    const result = yield dbQuery
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
        yield Promise.all(promises);
        res.status(200).json({ count: codeCount, codes: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
}));
const getCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId } = req.body;
    const code = yield Code_1.default.findById(codeId)
        .populate("user", "name avatarImage countryCode level roles");
    if (code) {
        const isUpvoted = currentUserId ? yield Upvote_1.default.findOne({ parentId: codeId, user: currentUserId }) : false;
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
}));
const getTemplate = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
}));
const editCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId, name, isPublic, source, cssSource, jsSource } = req.body;
    if (typeof name === "undefined" || typeof isPublic === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const code = yield Code_1.default.findById(codeId);
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
        yield code.save();
        res.json({
            success: true,
            data: {
                id: code._id,
                name: code.name,
                isPublic: code.isPublic,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource
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
const deleteCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId } = req.body;
    const code = yield Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    if (currentUserId != code.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        yield Code_1.default.deleteAndCleanup(codeId);
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
}));
const voteCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId, vote } = req.body;
    if (typeof vote === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const code = yield Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    let upvote = yield Upvote_1.default.findOne({ parentId: codeId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = yield Upvote_1.default.create({ user: currentUserId, parentId: codeId });
            code.$inc("votes", 1);
            yield code.save();
        }
    }
    else if (vote === 0) {
        if (upvote) {
            yield Upvote_1.default.deleteOne({ _id: upvote._id });
            upvote = null;
            code.$inc("votes", -1);
            yield code.save();
        }
    }
    res.json({ vote: upvote ? 1 : 0 });
}));
const createJob = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { language, source, stdin } = req.body;
    const job = yield EvaluationJob_1.default.create({
        language,
        source,
        stdin
    });
    res.json({
        jobId: job._id
    });
}));
const getJob = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.body;
    const job = yield EvaluationJob_1.default.findById(jobId).select("-source");
    if (!job) {
        res.status(404).json({ message: "Job does not exist" });
        return;
    }
    res.json({
        job: {
            id: job._id,
            status: job.status,
            language: job.language,
            stdin: job.stdin,
            stdout: job.stdout,
            stderr: job.stderr
        }
    });
}));
const codesController = {
    createCode,
    getCodeList,
    getCode,
    getTemplate,
    editCode,
    deleteCode,
    voteCode,
    createJob,
    getJob
};
exports.default = codesController;
