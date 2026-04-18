import { Response } from "express";
import ChallengeModel, { Challenge, TestCase } from "../models/Challenge";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import { escapeRegex } from "../utils/regexUtils";
import { createChallengeJobSchema, createChallengeSchema, editChallengeSchema, getChallengeCodeSchema, getChallengeJobSchema, getChallengeListSchema, getChallengeSchema, saveChallengeCodeSchema, unlockChallengeSolutionSchema } from "../validation/challengeSchema";
import { parseWithZod } from "../utils/zodUtils";
import mongoose, { Types } from "mongoose";
import CodeModel from "../models/Code";
import EvaluationJobModel from "../models/EvaluationJob";
import ChallengeSubmissionModel, { ChallengeSubmission } from "../models/ChallengeSubmission";
import ChallengeUnlockModel from "../models/ChallengeUnlock";
import RolesEnum from "../data/RolesEnum";
import { deleteChallengesAndCleanup } from "../helpers/challengeHelper";
import { withTransaction } from "../utils/transaction";
import HttpError from "../exceptions/HttpError";
import UserModel from "../models/User";

type SubmissionEntry = Pick<ChallengeSubmission, "language" | "passed">;

interface ChallengeCode {
    id?: Types.ObjectId;
    language: string;
    source: string;
    createdAt?: Date;
    updatedAt?: Date;
    challenge: {
        id: string;
        lastSubmission?: {
            passed: boolean;
            testResults: { output?: string; stderr?: string; passed: boolean; time?: number }[];
        };
    }
};

const createChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createChallengeSchema, req);
    const { title, description, difficulty, testCases, templates, xp, isVisible, solution } = body;
    const currentUserId = req.userId;

    const challenge = await ChallengeModel.create({
        title,
        description,
        difficulty,
        testCases,
        templates,
        xp,
        isPublic: Number(isVisible) === 1,
        author: currentUserId,
        solution
    });

    res.json({ success: true, data: { challenge: { id: challenge._id } } });
});

const getChallengeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeListSchema, req);
    const { page, count, difficulty, searchQuery, isVisible, userId, filter } = body;

    const isPublic = Number(isVisible) === 1;
    const isAuthorized =
        req.roles && req.roles.some(r => [RolesEnum.ADMIN, RolesEnum.CREATOR].includes(r));

    if (!isPublic && !isAuthorized) {
        throw new HttpError("Unauthorized User", 404);
    }

    const challengeQuery: mongoose.QueryFilter<Challenge> = {
        $or: [{ isPublic }, { isPublic: { $exists: false } }]
    };

    if (difficulty) challengeQuery.difficulty = difficulty;

    if (searchQuery && searchQuery.trim()) {
        const safe = escapeRegex(searchQuery.trim());
        challengeQuery.title = new RegExp(`(^|\\b)${safe}`, "i");
    }

    if (filter === 2 || filter === 3) {
        if (!userId) {
            throw new HttpError("Invalid request", 400);
        }
        const passedIds = await ChallengeSubmissionModel.distinct("challenge", {
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
        ChallengeModel.countDocuments(challengeQuery),
        ChallengeModel.find(challengeQuery)
            .select("title difficulty totalSubmissions passedSubmissions solution")
            .skip((page - 1) * count)
            .limit(count)
            .lean()
    ]);

    let submissionsMap = new Map<string, SubmissionEntry[]>();
    let unlockedMap = new Map<string, boolean>();

    if (userId && challenges.length) {
        const ids = challenges.map(c => c._id);

        const [subs, unlocks] = await Promise.all([
            ChallengeSubmissionModel.find({
                challenge: { $in: ids },
                user: userId,
                passed: true
            })
                .select({ challenge: 1, language: 1, passed: 1 })
                .lean(),
            ChallengeUnlockModel.find({
                challenge: { $in: ids },
                user: userId
            })
                .select({ challenge: 1 })
                .lean()
        ]);

        const tmp = new Map<string, Map<string, SubmissionEntry>>();

        for (const s of subs) {
            const k = String(s.challenge);
            if (!tmp.has(k)) tmp.set(k, new Map());
            tmp.get(k)!.set(String(s.language), { language: s.language, passed: true });
        }

        submissionsMap = new Map(
            Array.from(tmp.entries()).map(([k, v]) => [k, Array.from(v.values())])
        );

        for (const u of unlocks) {
            unlockedMap.set(String(u.challenge), true);
        }
    }

    const data = challenges.map(c => {
        const total = c.totalSubmissions ?? 0;
        const passedCount = c.passedSubmissions ?? 0;
        const acceptance = total > 0 ? (passedCount / total) * 100 : 0;
        
        return {
            id: c._id,
            title: c.title,
            difficulty: c.difficulty,
            acceptance: Number(acceptance.toFixed(1)),
            isSolved: userId ? !!submissionsMap.get(String(c._id)) : false,
            isUnlocked: userId ? !!unlockedMap.get(String(c._id)) : false,
            hasSolution: !!(c as any).solution && (c as any).solution.trim().length > 0,
            submissions: userId ? submissionsMap.get(String(c._id)) : undefined,
            totalSubmissions: total
        };
    });

    res.json({
        success: true,
        data: {
            count: total,
            challenges: data
        }
    });
});

const getChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;
    const userId = req.userId;

    const challenge = await ChallengeModel.findById(challengeId).lean();

    const isAuthorized = req.roles && req.roles.some(i => [RolesEnum.ADMIN, RolesEnum.CREATOR].includes(i));
    if (!challenge?.isPublic && !isAuthorized) {
        throw new HttpError("Challenge not found", 404);
    }

    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    const [submissions, hasUnlocked] = await Promise.all([
        ChallengeSubmissionModel.aggregate<SubmissionEntry>([
            { $match: { challenge: challenge._id, user: new mongoose.Types.ObjectId(userId), passed: true } },
            { $group: { _id: "$language", passed: { $max: "$passed" } } },
            { $project: { language: "$_id", passed: 1, _id: 0 } }
        ]),
        userId ? ChallengeUnlockModel.exists({ challenge: challenge._id, user: userId }) : Promise.resolve(null)
    ]);

    const isSolved = submissions.length > 0;
    const showSolution = isSolved || hasUnlocked || isAuthorized;

    res.json({
        success: true,
        data: {
            challenge: {
                id: challenge._id,
                description: challenge.description,
                difficulty: challenge.difficulty,
                xp: challenge.xp ?? 0,
                totalSubmissions: challenge.totalSubmissions ?? 0,
                title: challenge.title,
                testCases: (challenge.testCases as (TestCase & { _id: Types.ObjectId })[]).map((x) => (x.isHidden ?
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
                submissions,
                solution: showSolution ? (challenge.solution ?? "") : null,
                isUnlocked: !!hasUnlocked
            }
        }
    });
});

const unlockChallengeSolution = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(unlockChallengeSolutionSchema, req);
    const { challengeId } = body;
    const userId = req.userId;

    const challenge = await ChallengeModel.findById(challengeId).lean();
    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    const alreadyUnlocked = await ChallengeUnlockModel.exists({ challenge: challengeId, user: userId });
    if (!alreadyUnlocked) {
        await ChallengeUnlockModel.create({ challenge: challengeId, user: userId });
    }

    res.json({ success: true });
});

const getChallengeCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeCodeSchema, req);
    const { challengeId, language } = body;
    const currentUserId = req.userId;

    const code = await CodeModel.findOne({ challenge: challengeId, language, user: currentUserId }).lean();

    let data: ChallengeCode;

    if (code) {
        data = {
            id: code._id,
            language,
            createdAt: code.createdAt,
            updatedAt: code.updatedAt,
            source: code.source,
            challenge: {
                id: challengeId
            }
        };
    } else {
        const challenge = await ChallengeModel.findById(challengeId).lean();
        const template = challenge?.templates.find(x => x.name === language) ?? { source: "" };

        data = {
            language,
            source: template.source,
            challenge: {
                id: challengeId
            }
        };
    }

    const submissions = await ChallengeSubmissionModel.find({ challenge: challengeId, language, user: currentUserId })
        .sort({ createdAt: "desc" })
        .limit(1)
        .lean();

    if (submissions.length > 0) {
        data.challenge.lastSubmission = {
            passed: submissions[0].passed,
            testResults: submissions[0].testResults.map(x => ({
                output: x.output,
                stderr: x.stderr,
                passed: x.passed,
                time: x.time
            }))
        };
    }

    res.json({ success: true, data: { code: data } });
});

const saveChallengeCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(saveChallengeCodeSchema, req);
    const { challengeId, language, source, title } = body;
    const currentUserId = req.userId;

    let code = await CodeModel.findOne({ challenge: challengeId, language, user: currentUserId });

    if (code) {
        code.source = source;
        await code.save();
    } else {
        code = await CodeModel.create({
            challenge: challengeId,
            language,
            user: currentUserId,
            source,
            name: `CH: ${title}_${language}`
        });
    }

    res.json({
        success: true,
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

    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    res.json({
        success: true,
        data: {
            challenge: {
                id: challenge._id,
                description: challenge.description,
                difficulty: challenge.difficulty,
                title: challenge.title,
                xp: challenge.xp ?? 0,
                isPublic: challenge.isPublic ?? true,
                solution: challenge.solution ?? "",
                templates: challenge.templates.map(x => ({
                    name: x.name,
                    source: x.source
                })),
                testCases: (challenge.testCases as (TestCase & { _id: mongoose.Types.ObjectId })[]).map(x => ({
                    id: x._id,
                    input: x.input,
                    expectedOutput: x.expectedOutput,
                    isHidden: x.isHidden
                }))
            }
        }
    });
});

const editChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editChallengeSchema, req);
    const { challengeId, title, description, difficulty, testCases, templates, xp, isVisible } = body;
    const challenge = await ChallengeModel.findById(challengeId);

    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    challenge.title = title;
    challenge.description = description;
    challenge.difficulty = difficulty;
    challenge.testCases = testCases;
    challenge.templates = templates;
    challenge.xp = xp;
    challenge.isPublic = Number(isVisible) === 1;
    challenge.solution = body.solution ?? "";

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
            isPublic: challenge.isPublic,
            solution: challenge.solution
        }
    });
});

const deleteChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await ChallengeModel.findById(challengeId).lean();

    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    await withTransaction(async (session) => {
        await deleteChallengesAndCleanup({ _id: challengeId }, session);
    });

    res.json({ success: true });
});

const createChallengeJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createChallengeJobSchema, req);
    const { challengeId, language, source } = body;
    const deviceId = req.deviceId;
    const currentUserId = req.userId;

    const challenge = await ChallengeModel.findById(challengeId, "testCases").lean();
    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    const job = await EvaluationJobModel.create({
        challenge: challenge._id,
        language,
        source,
        stdin: challenge.testCases.map(x => x.input),
        user: currentUserId,
        deviceId
    });

    res.json({ success: true, data: { jobId: job._id } });
});

const getChallengeJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeJobSchema, req);
    const { jobId } = body;

    const job = await EvaluationJobModel.findById(jobId, { source: 0 })
        .populate<{ submission: ChallengeSubmission }>("submission")
        .lean();

    if (!job) {
        throw new HttpError("Job does not exist", 404);
    }

    res.json({
        success: true,
        data: {
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
    getChallengeJob,
    unlockChallengeSolution
};

export default ChallengeController;
