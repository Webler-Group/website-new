import { Response } from "express";
import Challenge from "../models/Challenge";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import { escapeRegex } from "../utils/regexUtils";
import { createChallengeJobSchema, createChallengeSchema, editChallengeSchema, getChallengeCodeSchema, getChallengeJobSchema, getChallengeListSchema, getChallengeSchema, saveChallengeCodeSchema } from "../validation/challengeSchema";
import { parseWithZod } from "../utils/zodUtils";
import mongoose, { PipelineStage } from "mongoose";
import Code from "../models/Code";
import EvaluationJob from "../models/EvaluationJob";
import ChallengeSubmission, { IChallengeSubmissionDocument } from "../models/ChallengeSubmission";
import RolesEnum from "../data/RolesEnum";
import User from "../models/User";

const createChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createChallengeSchema, req);
    const { title, description, difficulty, testCases, templates, xp, isVisible } = body;

    const challenge = await Challenge.create({
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

const getChallengeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeListSchema, req);
    const { page, count, difficulty, searchQuery, isVisible, userId, filter } = body;

    const isPublic = Number(isVisible) === 1;
    const isAuthorized =
        req.roles && req.roles.some(r => [RolesEnum.ADMIN, RolesEnum.CREATOR].includes(r));

    if (!isPublic && !isAuthorized) {
        res.status(404).json({
            status: false,
            error: [{ message: "Unauthorized User" }, { message: "IsPublic should be true" }]
        });
        return;
    }

    const challengeQuery: any = {
        $or: [{ isPublic }, { isPublic: { $exists: false } }]
    };

    if (difficulty) challengeQuery.difficulty = difficulty;

    if (searchQuery && searchQuery.trim()) {
        const safe = escapeRegex(searchQuery.trim());
        challengeQuery.title = new RegExp(`(^|\\b)${safe}`, "i");
    }

    if (filter === 2 || filter === 3) {
        if (!userId) {
            res.status(400).json({ error: [{ message: "Invalid request" }] });
            return;
        }
        const passedIds = await ChallengeSubmission.distinct("challenge", {
            user: userId,
            passed: true
        });

        if (filter === 2) {
            challengeQuery._id = { $in: passedIds };
        } else {
            challengeQuery._id = { $nin: passedIds };
        }
    }

    const [total, challenges] = await Promise.all([
        Challenge.countDocuments(challengeQuery),
        Challenge.find(challengeQuery)
            .select({ title: 1, difficulty: 1 })
            .skip((page - 1) * count)
            .limit(count)
            .lean()
    ]);

    let submissionsMap = new Map<string, any[]>();

    if (userId && challenges.length) {
        const ids = challenges.map(c => c._id);

        const subs = await ChallengeSubmission.find({
            challenge: { $in: ids },
            user: userId,
            passed: true
        })
            .select({ challenge: 1, language: 1, passed: 1 })
            .lean();

        const tmp = new Map<string, Map<string, any>>();

        for (const s of subs) {
            const k = String(s.challenge);
            if (!tmp.has(k)) tmp.set(k, new Map());
            tmp.get(k)!.set(String(s.language), { language: s.language, passed: true });
        }

        submissionsMap = new Map(
            Array.from(tmp.entries()).map(([k, v]) => [k, Array.from(v.values())])
        );
    }

    const data = challenges.map(c => ({
        id: c._id,
        title: c.title,
        difficulty: c.difficulty,
        submissions: userId ? submissionsMap.get(String(c._id)) ?? [] : []
    }));

    res.json({ count: total, challenges: data });
});


const getChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await Challenge.findById(challengeId);

    // user cannot view private challenges
    const isAuthorized = req.roles && req.roles.some(i => [RolesEnum.ADMIN, RolesEnum.CREATOR].includes(i));
    if (!challenge?.isPublic && !isAuthorized) {
        res.status(404).json({
            success: false, error: [
                { message: "Unauthorized User cannot view private challenge" },
                { message: "Challenge not found" },
            ]
        });
        return;
    }

    if (!challenge) {
        res.status(404).json({ success: false, error: [{ message: "Challenge not found" }] });
        return;
    }

    const submissions = await ChallengeSubmission.aggregate([
        { $match: { challenge: challenge._id, user: new mongoose.Types.ObjectId(req.userId), passed: true } },
        { $group: { _id: "$language", passed: { $max: "$passed" } } },
        { $project: { language: "$_id", passed: 1, _id: 0 } }
    ]);

    res.json({
        success: true,
        challenge: {
            id: challenge._id,
            description: challenge.description,
            difficulty: challenge.difficulty,
            xp: challenge.xp ?? 0,
            title: challenge.title,
            testCases: challenge.testCases.map((x: any) => (x.isHidden ?
                {
                    id: x._id,
                    isHidden: x.isHidden
                } :
                {
                    id: x._id,
                    input: x.input,
                    expectedOutput: x.expectedOutput,
                    isHidden: x.isHidden
                })),
            submissions
        }
    });
});

const getChallengeCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeCodeSchema, req);
    const { challengeId, language } = body;
    const currentUserId = req.userId;

    let data: any;

    const code = await Code.findOne({ challenge: challengeId, language, user: currentUserId }).lean();

    if (code) {
        data = {
            id: code._id,
            language,
            createdAt: code.createdAt,
            updatedAt: code.updatedAt,
            source: code.source,
            challengeId
        }
    } else {
        const challenge = await Challenge.findById(challengeId);
        const template = challenge?.templates.find(x => x.name === language) || { source: "" };

        data = {
            language,
            source: template.source,
            challengeId
        };
    }

    const submissions: IChallengeSubmissionDocument[] = await ChallengeSubmission.find({ challenge: challengeId, language, user: currentUserId })
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

const saveChallengeCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(saveChallengeCodeSchema, req);
    const { challengeId, language, source, title } = body;
    const currentUserId = req.userId;

    let code = await Code.findOne({ challenge: challengeId, language, user: currentUserId });

    if (code) {

        code.source = source;
        await code.save();

    } else {

        code = await Code.create({
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

const getEditedChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await Challenge.findById(challengeId).lean();

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
            xp: challenge.xp ?? 0,
            isPublic: challenge.isPublic ?? true,
            templates: challenge.templates.map(x => ({
                name: x.name,
                source: x.source
            })),
            testCases: challenge.testCases.map((x: any) => ({
                id: x._id,
                input: x.input,
                expectedOutput: x.expectedOutput,
                isHidden: x.isHidden
            }))
        }
    });
});

const editChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editChallengeSchema, req);
    const { challengeId, title, description, difficulty, testCases, templates, xp, isVisible } = body;
    const challenge = await Challenge.findById(challengeId);

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


const deleteChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        res.status(404).json({ success: false, error: [{ message: "Challenge not found" }] });
        return;
    }

    await Challenge.findByIdAndDelete(challengeId);

    res.json({ success: true });
});

const createChallengeJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createChallengeJobSchema, req);
    const { challengeId, language, source } = body;
    const deviceId = req.deviceId;
    const currentUserId = req.userId;

    const challenge = await Challenge.findById(challengeId, "testCases");
    if (!challenge) {
        res.status(404).json({ error: [{ message: "Challenge not found" }] });
        return;
    }

    const job = await EvaluationJob.create({
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

const getChallengeJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeJobSchema, req);
    const { jobId } = body;

    const job = await EvaluationJob.findById(jobId)
        .select("-source")
        .populate<{ submission: IChallengeSubmissionDocument }>("submission")
        .lean();

    if (!job) {
        res.status(404).json({ error: [{ message: "Job does not exist" }] });
        return;
    }

    if (job.submission && job.submission.passed) {
        const user = await User.findById(req.userId);
        const challenge = await Challenge.findById(job.challenge);
        if (user) {
            const reward = challenge ? challenge.xp : 0;
            const submission = await ChallengeSubmission.findOne({ user: req.userId, challenge: job.challenge, language: job.language });
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

export default ChallengeController;