"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Challenge_1 = __importDefault(require("../models/Challenge"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const regexUtils_1 = require("../utils/regexUtils");
const challengeSchema_1 = require("../validation/challengeSchema");
const zodUtils_1 = require("../utils/zodUtils");
const mongoose_1 = __importDefault(require("mongoose"));
const Code_1 = __importDefault(require("../models/Code"));
const EvaluationJob_1 = __importDefault(require("../models/EvaluationJob"));
const ChallengeSubmission_1 = __importDefault(require("../models/ChallengeSubmission"));
const RolesEnum_1 = __importDefault(require("../data/RolesEnum"));
const User_1 = __importDefault(require("../models/User"));
const createChallenge = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.createChallengeSchema, req);
    const { title, description, difficulty, testCases, templates, xp, isVisible } = body;
    const challenge = await Challenge_1.default.create({
        title,
        description,
        difficulty,
        testCases,
        templates,
        xp,
        isPublic: Number(isVisible) === 1,
        author: req.userId,
    });
    res.json({ success: true, challenge: { id: challenge._id } });
});
const getChallengeList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.getChallengeListSchema, req);
    const { page, count, difficulty, searchQuery, isVisible } = body;
    const currentUserId = req.userId;
    const pipeline = [];
    const isPublic = Number(isVisible) === 1;
    const isAuthorized = req.roles && req.roles.some(i => [RolesEnum_1.default.ADMIN, RolesEnum_1.default.CREATOR].includes(i));
    ;
    if ((!isPublic && !isAuthorized)) {
        res.status(404).json({ status: false, error: [
                { message: "Unauthorized User" },
                { message: "IsPublic should be true" }
            ] });
        return;
    }
    const matchStage = {
        $match: {
            $or: [
                { isPublic },
                { isPublic: { $exists: false } }
            ]
        }
    };
    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = (0, regexUtils_1.escapeRegex)(searchQuery.trim());
        const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");
        matchStage.$match.$or = [
            { title: searchRegex }
        ];
    }
    if (difficulty) {
        matchStage.$match.difficulty = difficulty;
    }
    if (Object.keys(matchStage.$match).length > 0) {
        pipeline.push(matchStage);
    }
    pipeline.push({
        $facet: {
            count: [{ $count: "total" }],
            data: [
                { $skip: (page - 1) * count },
                { $limit: count },
                {
                    $lookup: {
                        from: "challengesubmissions",
                        let: { ch_id: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$challenge", "$$ch_id"] },
                                            { $eq: ["$user", new mongoose_1.default.Types.ObjectId(currentUserId)] },
                                            { $eq: ["$passed", true] }
                                        ]
                                    }
                                }
                            },
                            { $group: { _id: "$language", passed: { $max: "$passed" } } },
                            { $project: { language: "$_id", passed: 1, _id: 0 } }
                        ],
                        as: "submissions"
                    }
                },
                {
                    $project: {
                        id: "$_id",
                        title: 1,
                        difficulty: 1,
                        submissions: 1
                    }
                }
            ]
        }
    });
    const result = await Challenge_1.default.aggregate(pipeline);
    const challengeCount = result[0].count[0]?.total || 0;
    const data = result[0].data;
    res.json({ count: challengeCount, challenges: data });
});
const getChallenge = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.getChallengeSchema, req);
    const { challengeId } = body;
    const challenge = await Challenge_1.default.findById(challengeId);
    // user cannot view private challenges
    const isAuthorized = req.roles && req.roles.some(i => [RolesEnum_1.default.ADMIN, RolesEnum_1.default.CREATOR].includes(i));
    if (!challenge?.isPublic && !isAuthorized) {
        res.status(404).json({ success: false, error: [
                { message: "Unauthorized User cannot view private challenge" },
                { message: "Challenge not found" },
            ] });
        return;
    }
    if (!challenge) {
        res.status(404).json({ success: false, error: [{ message: "Challenge not found" }] });
        return;
    }
    const submissions = await ChallengeSubmission_1.default.aggregate([
        { $match: { challenge: challenge._id, user: new mongoose_1.default.Types.ObjectId(req.userId), passed: true } },
        { $group: { _id: "$language", passed: { $max: "$passed" } } },
        { $project: { language: "$_id", passed: 1, _id: 0 } }
    ]);
    res.json({
        success: true,
        challenge: {
            id: challenge._id,
            description: challenge.description,
            difficulty: challenge.difficulty,
            title: challenge.title,
            testCases: challenge.testCases.map(x => (x.isHidden ?
                {
                    isHidden: x.isHidden
                } :
                {
                    input: x.input,
                    expectedOutput: x.expectedOutput,
                    isHidden: x.isHidden
                })),
            submissions
        }
    });
});
const getChallengeCode = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.getChallengeCodeSchema, req);
    const { challengeId, language } = body;
    const currentUserId = req.userId;
    let data;
    const code = await Code_1.default.findOne({ challenge: challengeId, language, user: currentUserId }).lean();
    if (code) {
        data = {
            id: code._id,
            language,
            createdAt: code.createdAt,
            updatedAt: code.updatedAt,
            source: code.source,
            challengeId
        };
    }
    else {
        const challenge = await Challenge_1.default.findById(challengeId);
        const template = challenge?.templates.find(x => x.name === language) || { source: "" };
        data = {
            language,
            source: template.source,
            challengeId
        };
    }
    const submissions = await ChallengeSubmission_1.default.find({ challenge: challengeId, language, user: currentUserId })
        .sort({ createdAt: "desc" })
        .limit(1)
        .lean();
    if (submissions.length > 0) {
        data.lastSubmission = {
            passed: submissions[0].passed,
            testResults: submissions[0].testResults.map(x => ({
                output: x.output,
                stderr: x.stderr,
                passed: x.passed,
                time: x.time
            }))
        };
    }
    res.json({
        code: data
    });
});
const saveChallengeCode = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.saveChallengeCodeSchema, req);
    const { challengeId, language, source, title } = body;
    const currentUserId = req.userId;
    let code = await Code_1.default.findOne({ challenge: challengeId, language, user: currentUserId });
    if (code) {
        code.source = source;
        await code.save();
    }
    else {
        code = await Code_1.default.create({
            challenge: challengeId,
            language,
            user: currentUserId,
            source,
            name: `CH: ${title}_${language}`
        });
    }
    res.json({
        data: {
            id: code._id,
            language: code.language,
            createdAt: code.createdAt,
            updatedAt: code.updatedAt,
            source: code.source,
            challengeId: code.challenge
        }
    });
});
const getEditedChallenge = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.getChallengeSchema, req);
    const { challengeId } = body;
    const challenge = await Challenge_1.default.findById(challengeId).lean();
    if (!challenge) {
        res.status(404).json({ success: false, error: [{ message: "Challenge not found" }] });
        return;
    }
    res.json({
        success: true,
        challenge: {
            id: challenge._id,
            description: challenge.description,
            difficulty: challenge.difficulty,
            title: challenge.title,
            xp: challenge.xp,
            isPublic: challenge.isPublic ?? true,
            templates: challenge.templates.map(x => ({
                name: x.name,
                source: x.source
            })),
            testCases: challenge.testCases.map(x => ({
                input: x.input,
                expectedOutput: x.expectedOutput,
                isHidden: x.isHidden
            }))
        }
    });
});
const editChallenge = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.editChallengeSchema, req);
    const { challengeId, title, description, difficulty, testCases, templates, xp, isVisible } = body;
    const challenge = await Challenge_1.default.findById(challengeId);
    if (!challenge) {
        res.status(404).json({ success: false, error: [{ message: "Challenge not found" }] });
        return;
    }
    challenge.title = title;
    challenge.description = description;
    challenge.difficulty = difficulty;
    challenge.testCases = testCases;
    challenge.templates = templates;
    challenge.xp = xp;
    challenge.isPublic = Number(isVisible) === 1;
    await challenge.save();
    res.json({
        success: true,
        data: {
            id: challenge._id,
            title: challenge.title,
            description: challenge.description,
            difficulty: challenge.difficulty,
            testCases: challenge.testCases,
            templates: challenge.templates,
            xp: challenge.xp,
            isPublic: challenge.isPublic
        }
    });
});
const deleteChallenge = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.getChallengeSchema, req);
    const { challengeId } = body;
    const challenge = await Challenge_1.default.findById(challengeId);
    if (!challenge) {
        res.status(404).json({ success: false, error: [{ message: "Challenge not found" }] });
        return;
    }
    await Challenge_1.default.findByIdAndDelete(challengeId);
    res.json({ success: true });
});
const createChallengeJob = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.createChallengeJobSchema, req);
    const { challengeId, language, source } = body;
    const deviceId = req.deviceId;
    const currentUserId = req.userId;
    const challenge = await Challenge_1.default.findById(challengeId, "testCases");
    if (!challenge) {
        res.status(404).json({ error: [{ message: "Challenge not found" }] });
        return;
    }
    const job = await EvaluationJob_1.default.create({
        challenge: challenge._id,
        language,
        source,
        stdin: challenge.testCases.map(x => x.input),
        user: currentUserId,
        deviceId
    });
    res.json({
        jobId: job._id
    });
});
const getChallengeJob = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(challengeSchema_1.getChallengeJobSchema, req);
    const { jobId } = body;
    const job = await EvaluationJob_1.default.findById(jobId)
        .select("-source")
        .populate("submission")
        .lean();
    if (!job) {
        res.status(404).json({ error: [{ message: "Job does not exist" }] });
        return;
    }
    if (job.submission && job.submission.passed) {
        const user = await User_1.default.findById(req.userId);
        const challenge = await Challenge_1.default.findById(job.challenge);
        if (user) {
            const reward = challenge ? challenge.xp : 0;
            const submission = await ChallengeSubmission_1.default.findOne({ user: req.userId, challenge: job.challenge, language: job.language });
            // reward user once the first time they passed a challenge for a particular language
            if (submission && submission.reward != reward) {
                user.xp += reward;
                submission.reward = reward;
                await user.save();
                await submission.save();
            }
        }
    }
    res.json({
        job: {
            id: job._id,
            deviceId: job.deviceId,
            status: job.status,
            language: job.language,
            submission: job.submission ? {
                testResults: job.submission.testResults.map(x => ({
                    output: x.output,
                    stderr: x.stderr,
                    passed: x.passed,
                    time: x.time
                })),
                passed: job.submission.passed
            } : null
        }
    });
});
const ChallengeController = {
    createChallenge,
    getChallengeList,
    getChallenge,
    getEditedChallenge,
    editChallenge,
    deleteChallenge,
    getChallengeCode,
    saveChallengeCode,
    createChallengeJob,
    getChallengeJob
};
exports.default = ChallengeController;
