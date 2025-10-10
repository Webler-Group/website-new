import { Response } from "express";
import Challenge from "../models/Challenge";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import { escapeRegex } from "../utils/regexUtils";
import { createChallengeJobSchema, createChallengeSchema, editChallengeSchema, getChallengeCodeSchema, getChallengeJobSchema, getChallengeListSchema, getChallengeSchema, saveChallengeCodeSchema } from "../validation/challengeSchema";
import { parseWithZod } from "../utils/zodUtils";
import mongoose, { PipelineStage } from "mongoose";
import Code from "../models/Code";
import templates from "../data/templates";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import EvaluationJob from "../models/EvaluationJob";
import ChallengeSubmission, { IChallengeSubmissionDocument } from "../models/ChallengeSubmission";

const createChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createChallengeSchema, req);
    const { title, description, difficulty, testCases, templates } = body;

    const challenge = await Challenge.create({
        title,
        description,
        difficulty,
        testCases,
        templates,
        author: req.userId,
    });

    res.json({ success: true, challenge: { id: challenge._id } });
});

const getChallengeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeListSchema, req);
    const { page, count, difficulty, searchQuery } = body;
    const currentUserId = req.userId;

    const pipeline: PipelineStage[] = [];

    const matchStage: PipelineStage.Match = { $match: {} };

    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = escapeRegex(searchQuery.trim());
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
                                            { $eq: ["$user", new mongoose.Types.ObjectId(currentUserId)] },
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

    const result = await Challenge.aggregate(pipeline);

    const challengeCount = result[0].count[0]?.total || 0;
    const data = result[0].data;

    res.json({ count: challengeCount, challenges: data });
});

const getChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await Challenge.findById(challengeId);

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
        const template = templates.find(x => x.language === language);

        data = {
            language,
            source: template?.source ?? "",
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
    const { challengeId, language, source } = body;
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
            name: "Unnamed"
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

const editChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editChallengeSchema, req);
    const { challengeId, title, description, difficulty, testCases, templates } = body;
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

    await challenge.save();
    res.json({
        success: true,
        data: {
            id: challenge._id,
            title: challenge.title,
            description: challenge.description,
            difficulty: challenge.difficulty,
            testCases: challenge.testCases,
            templates: challenge.templates
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

    res.json({
        job: {
            id: job._id,
            deviceId: job.deviceId,
            status: job.status,
            language: job.language,
            submission: job.submission ? {
                testResults: job.submission.testResults.map(x => ({
                    output: x.output,
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