import { Response } from "express";
import ChallengeModel, { Challenge, TestCase } from "../models/Challenge";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import { escapeRegex } from "../utils/regexUtils";
import { createChallengeCollectionSchema, createChallengeJobSchema, createChallengeSchema, deleteChallengeCollectionSchema, editChallengeCollectionSchema, editChallengeSchema, getChallengeCodeSchema, getChallengeCollectionSchema, getChallengeJobSchema, importChallengesSchema, getChallengeListSchema, getChallengeSchema, getChallengeTagsSchema, saveChallengeCodeSchema, searchChallengesSchema, unlockChallengeSolutionSchema } from "../validation/challengeSchema";
import { parseWithZod } from "../utils/zodUtils";
import mongoose, { Types } from "mongoose";
import CodeModel from "../models/Code";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import { addEvaluationJob, getEvaluationJob } from "../queues/evaluationQueue";
import ChallengeSubmissionModel, { ChallengeSubmission, TestResult } from "../models/ChallengeSubmission";
import ChallengeUnlockModel from "../models/ChallengeUnlock";
import RolesEnum from "../data/RolesEnum";
import { deleteChallengesAndCleanup } from "../helpers/challengeHelper";
import { withTransaction } from "../utils/transaction";
import HttpError from "../exceptions/HttpError";
import UserModel from "../models/User";
import TagModel, { Tag } from "../models/Tag";
import { getOrCreateTagsByNames } from "../helpers/discussionHelper";
import ChallengeCollectionModel from "../models/ChallengeCollection";
import { challengeSetSchema, importChallengeSet } from "../helpers/challengeImportHelper";
import multer from "multer";
import MulterFileTypeError from "../exceptions/MulterFileTypeError";
import { getChallengeXp } from "../helpers/userHelper";

type SubmissionEntry = Pick<ChallengeSubmission, "language" | "passed">;

interface ChallengeCode {
    id?: Types.ObjectId;
    language: string;
    source: string;
    createdAt?: Date;
    updatedAt?: Date;
    challenge: {
        id: string;
        lastSubmission?: ReturnType<typeof formatSubmission>;
    }
};

/**
 * Test results as shown to the submitting user. Hidden tests keep their verdict, time and memory,
 * but not their input and expected output.
 */
const formatSubmission = (submission: Pick<ChallengeSubmission, "passed" | "testResults" | "timeLimit">) => ({
    passed: submission.passed,
    timeLimit: submission.timeLimit,
    testResults: submission.testResults.map((x: TestResult) => ({
        passed: x.passed,
        verdict: x.verdict,
        isHidden: x.isHidden,
        input: x.isHidden ? undefined : x.input,
        expectedOutput: x.isHidden ? undefined : x.expectedOutput,
        output: x.output,
        stderr: x.stderr,
        time: x.time,
        memory: x.memory
    }))
});

const normalizeTags = (tags: string[]) => tags.map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

const getPassedChallengeIds = async (userId: string | undefined, challengeIds: Types.ObjectId[]) => {
    if (!userId || challengeIds.length === 0) return new Set<string>();
    const ids = await ChallengeSubmissionModel.distinct("challenge", {
        challenge: { $in: challengeIds },
        user: userId,
        everPassed: true
    });
    return new Set(ids.map(String));
};

const createChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createChallengeSchema, req);
    const { title, description, difficulty, testCases, templates, isVisible, solution, tags, timeLimit } = body;
    const currentUserId = req.userId;

    const tagIds = (await getOrCreateTagsByNames(normalizeTags(tags ?? []))).map(x => x._id);

    const challenge = await ChallengeModel.create({
        title,
        description,
        difficulty,
        testCases,
        templates,
        timeLimit: timeLimit ?? undefined,
        tags: tagIds,
        isPublic: Number(isVisible) === 1,
        author: currentUserId,
        solution
    });

    res.json({ success: true, data: { challenge: { id: challenge._id } } });
});

const getChallengeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeListSchema, req);
    const { page, count, difficulty, searchQuery, isVisible, userId, filter, tag } = body;

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

    if (tag) {
        const tagDoc = await TagModel.findOne({ name: tag.trim().toLowerCase() }, { _id: 1 }).lean();
        challengeQuery.tags = tagDoc ? tagDoc._id : { $in: [] };
    }

    if (filter === 2 || filter === 3) {
        if (!userId) {
            throw new HttpError("Invalid request", 400);
        }
        const passedIds = await ChallengeSubmissionModel.distinct("challenge", {
            user: userId,
            everPassed: true
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
            .select("title difficulty totalSubmissions passedSubmissions solution tags")
            .sort({ _id: 1 })
            .skip((page - 1) * count)
            .limit(count)
            .populate<{ tags: Tag[] }>("tags", "name")
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
                everPassed: true
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
            totalSubmissions: total,
            tags: (c.tags ?? []).map(t => t.name)
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

    const challenge = await ChallengeModel.findById(challengeId).populate<{ tags: Tag[] }>("tags", "name").lean();

    const isAuthorized = req.roles && req.roles.some(i => [RolesEnum.ADMIN, RolesEnum.CREATOR].includes(i));
    if (!challenge?.isPublic && !isAuthorized) {
        throw new HttpError("Challenge not found", 404);
    }

    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    const [submissions, hasUnlocked, latestSubmission, latestCode] = await Promise.all([
        ChallengeSubmissionModel.aggregate<SubmissionEntry>([
            { $match: { challenge: challenge._id, user: new mongoose.Types.ObjectId(userId), everPassed: true } },
            { $group: { _id: "$language", passed: { $max: "$everPassed" } } },
            { $project: { language: "$_id", passed: 1, _id: 0 } }
        ]),
        userId ? ChallengeUnlockModel.exists({ challenge: challenge._id, user: userId }) : Promise.resolve(null),
        // The user's latest test run (one submission per language, updated on every run)
        userId ? ChallengeSubmissionModel.findOne({ challenge: challenge._id, user: userId }, { language: 1, updatedAt: 1 })
            .sort({ updatedAt: -1 })
            .lean<{ language: CompilerLanguagesEnum; updatedAt: Date }>() : Promise.resolve(null),
        // ... and latest saved code (one code per language, updated on every save)
        userId ? CodeModel.findOne({ challenge: challenge._id, user: userId }, { language: 1, updatedAt: 1 })
            .sort({ updatedAt: -1 })
            .lean() : Promise.resolve(null)
    ]);

    // Whichever is newer is the language the user last worked in; it's only offered while unsolved,
    // older attempts in other languages are not considered
    const latestAttempt = [latestSubmission, latestCode]
        .filter(x => x != null)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    const lastAttemptLanguage = latestAttempt && !submissions.some(x => x.language === latestAttempt.language)
        ? latestAttempt.language
        : null;

    const isSolved = submissions.length > 0;
    const showSolution = isSolved || hasUnlocked || isAuthorized;

    res.json({
        success: true,
        data: {
            challenge: {
                id: challenge._id,
                description: challenge.description,
                difficulty: challenge.difficulty,
                xp: getChallengeXp(challenge.difficulty),
                totalSubmissions: challenge.totalSubmissions ?? 0,
                title: challenge.title,
                tags: (challenge.tags ?? []).map(t => t.name),
                templates: challenge.templates.map(x => ({ name: x.name })),
                timeLimit: challenge.timeLimit,
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
                isUnlocked: !!hasUnlocked,
                lastAttemptLanguage
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
        data.challenge.lastSubmission = formatSubmission(submissions[0]);
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

    const challenge = await ChallengeModel.findById(challengeId).populate<{ tags: Tag[] }>("tags", "name").lean();

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
                tags: (challenge.tags ?? []).map(t => t.name),
                xp: getChallengeXp(challenge.difficulty),
                isPublic: challenge.isPublic ?? true,
                solution: challenge.solution ?? "",
                timeLimit: challenge.timeLimit,
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
    const { challengeId, title, description, difficulty, testCases, templates, isVisible, tags, timeLimit } = body;
    const challenge = await ChallengeModel.findById(challengeId);

    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    if (tags) {
        challenge.tags = (await getOrCreateTagsByNames(normalizeTags(tags))).map(x => x._id);
    }

    challenge.title = title;
    challenge.description = description;
    challenge.difficulty = difficulty;
    challenge.testCases = testCases;
    challenge.templates = templates;
    challenge.timeLimit = timeLimit ?? undefined;
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
            timeLimit: challenge.timeLimit,
            xp: getChallengeXp(challenge.difficulty),
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

    const challenge = await ChallengeModel.findById(challengeId, "testCases timeLimit").lean();
    if (!challenge) {
        throw new HttpError("Challenge not found", 404);
    }

    const jobId = await addEvaluationJob({
        challengeId: challenge._id.toString(),
        language,
        source,
        stdin: challenge.testCases.map(x => x.input),
        testCases: challenge.testCases.map(x => ({ input: x.input, expectedOutput: x.expectedOutput, isHidden: x.isHidden })),
        timeLimit: challenge.timeLimit,
        userId: currentUserId?.toString(),
        deviceId: deviceId!
    });

    res.json({ success: true, data: { jobId } });
});

const getChallengeJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeJobSchema, req);
    const { jobId } = body;

    const job = await getEvaluationJob(jobId);

    if (!job) {
        throw new HttpError("Job does not exist", 404);
    }

    const submissionId = job.returnValue?.submissionId;
    // XP rewards are private to the user who submitted the solution
    const xpAwarded = req.userId && job.data.userId === req.userId.toString() ? job.returnValue?.xpAwarded : undefined;
    const submission = submissionId ?
        await ChallengeSubmissionModel.findById(submissionId, { testResults: 1, passed: 1, timeLimit: 1 }).lean() :
        null;

    res.json({
        success: true,
        data: {
            job: {
                id: job.id,
                deviceId: job.data.deviceId,
                status: job.status,
                language: job.data.language,
                submission: submission ? formatSubmission(submission) : null,
                xpAwarded: xpAwarded ? {
                    total: xpAwarded.total,
                    rewards: xpAwarded.rewards,
                    xp: xpAwarded.xp,
                    level: xpAwarded.level
                } : null
            }
        }
    });
});

const getCollectionList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const isAuthorized = req.roles && req.roles.some(r => [RolesEnum.ADMIN, RolesEnum.CREATOR].includes(r));

    const collections = await ChallengeCollectionModel.find(isAuthorized ? {} : { isPublic: true })
        .sort({ _id: 1 })
        .lean();

    const allIds = collections.flatMap(c => c.sections.flatMap(s => s.challenges));
    const visibleIds = new Set(
        (await ChallengeModel.find({ _id: { $in: allIds }, ...(isAuthorized ? {} : { isPublic: true }) }, { _id: 1 }).lean())
            .map(x => String(x._id))
    );
    const passed = await getPassedChallengeIds(req.userId, allIds);

    res.json({
        success: true,
        data: {
            collections: collections.map(c => {
                const ids = [...new Set(c.sections.flatMap(s => s.challenges).map(String))].filter(id => visibleIds.has(id));
                return {
                    id: c._id,
                    title: c.title,
                    description: c.description,
                    isPublic: c.isPublic,
                    sectionCount: c.sections.length,
                    challengeCount: ids.length,
                    solvedCount: ids.filter(id => passed.has(id)).length
                };
            })
        }
    });
});

const getCollection = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeCollectionSchema, req);
    const { collectionId } = body;
    const isAuthorized = req.roles && req.roles.some(r => [RolesEnum.ADMIN, RolesEnum.CREATOR].includes(r));

    const collection = await ChallengeCollectionModel.findById(collectionId).lean();
    if (!collection || (!collection.isPublic && !isAuthorized)) {
        throw new HttpError("Collection not found", 404);
    }

    const allIds = collection.sections.flatMap(s => s.challenges);
    const [challenges, passed] = await Promise.all([
        ChallengeModel.find({ _id: { $in: allIds }, ...(isAuthorized ? {} : { isPublic: true }) })
            .select("title difficulty tags isPublic")
            .populate<{ tags: Tag[] }>("tags", "name")
            .lean(),
        getPassedChallengeIds(req.userId, allIds)
    ]);
    const byId = new Map(challenges.map(c => [String(c._id), c]));

    res.json({
        success: true,
        data: {
            collection: {
                id: collection._id,
                title: collection.title,
                description: collection.description,
                isPublic: collection.isPublic,
                sections: collection.sections.map(s => ({
                    title: s.title,
                    description: s.description,
                    challenges: s.challenges
                        .map(id => byId.get(String(id)))
                        .filter(c => c !== undefined)
                        .map(c => ({
                            id: c._id,
                            title: c.title,
                            difficulty: c.difficulty,
                            xp: getChallengeXp(c.difficulty),
                            isPublic: c.isPublic,
                            tags: (c.tags ?? []).map(t => t.name),
                            isSolved: passed.has(String(c._id))
                        }))
                }))
            }
        }
    });
});

type CollectionFields = { title: string; description: string; isPublic: boolean; sections: { title: string; description: string; challenges: string[] }[] };

const validateCollection = async (fields: CollectionFields, collectionId?: string) => {
    const sectionTitles = fields.sections.map(s => s.title.toLowerCase());
    if (new Set(sectionTitles).size !== sectionTitles.length) {
        throw new HttpError("Section titles must be different from each other", 400);
    }

    const sameTitle = await ChallengeCollectionModel.exists({
        title: fields.title,
        ...(collectionId ? { _id: { $ne: collectionId } } : {})
    });
    if (sameTitle) {
        throw new HttpError("A collection with this title already exists", 400);
    }

    const ids = [...new Set(fields.sections.flatMap(s => s.challenges))];
    const found = await ChallengeModel.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) {
        throw new HttpError("Some of the selected challenges no longer exist", 400);
    }
};

const createCollection = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createChallengeCollectionSchema, req);
    await validateCollection(body);

    const collection = await ChallengeCollectionModel.create({ ...body, author: req.userId });

    res.json({ success: true, data: { collection: { id: collection._id } } });
});

const editCollection = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editChallengeCollectionSchema, req);
    const { collectionId, ...fields } = body;

    const collection = await ChallengeCollectionModel.findById(collectionId);
    if (!collection) {
        throw new HttpError("Collection not found", 404);
    }
    await validateCollection(fields, collectionId);

    collection.set(fields);
    await collection.save();

    res.json({ success: true, data: { collection: { id: collection._id } } });
});

const deleteCollection = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteChallengeCollectionSchema, req);

    const result = await ChallengeCollectionModel.deleteOne({ _id: body.collectionId });
    if (result.deletedCount === 0) {
        throw new HttpError("Collection not found", 404);
    }

    res.json({ success: true });
});

const getChallengeTags = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeTagsSchema, req);
    const isPublic = body.isVisible === 1;
    const isAuthorized = req.roles && req.roles.some(r => [RolesEnum.ADMIN, RolesEnum.CREATOR].includes(r));
    if (!isPublic && !isAuthorized) {
        throw new HttpError("Unauthorized User", 404);
    }

    const counts = await ChallengeModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { $or: [{ isPublic }, { isPublic: { $exists: false } }] } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } }
    ]);
    const tags = await TagModel.find({ _id: { $in: counts.map(c => c._id) } }, { name: 1 }).lean();
    const names = new Map(tags.map(t => [String(t._id), t.name]));

    res.json({
        success: true,
        data: {
            tags: counts
                .filter(c => names.has(String(c._id)))
                .map(c => ({ name: names.get(String(c._id))!, count: c.count }))
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        }
    });
});

const searchChallenges = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(searchChallengesSchema, req);

    const challenges = await ChallengeModel.find(body.query ? { title: new RegExp(escapeRegex(body.query), "i") } : {})
        .select("title difficulty isPublic")
        .sort({ title: 1 })
        .limit(15)
        .lean();

    res.json({
        success: true,
        data: {
            challenges: challenges.map(c => ({ id: c._id, title: c.title, difficulty: c.difficulty, isPublic: c.isPublic }))
        }
    });
});

const importUploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter(_req, file, cb) {
        if (file.mimetype === "application/json" || file.originalname.toLowerCase().endsWith(".json")) {
            cb(null, true);
        } else {
            cb(new MulterFileTypeError("Only .json files can be imported"));
        }
    }
});

const importChallenges = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body, file } = parseWithZod(importChallengesSchema, req);

    let parsed: unknown;
    try {
        parsed = JSON.parse(file.buffer.toString("utf8"));
    } catch (err) {
        throw new HttpError(`The file is not valid JSON: ${err instanceof Error ? err.message : err}`, 400);
    }

    const data = challengeSetSchema.parse(parsed);
    const dryRun = body.dryRun === "1";
    const summary = await importChallengeSet(data, req.userId!, dryRun);

    res.json({ success: true, data: { dryRun, summary } });
});

const ChallengeController = {
    importUploadMiddleware,
    importChallenges,
    getCollectionList,
    getCollection,
    getChallengeTags,
    createCollection,
    editCollection,
    deleteCollection,
    searchChallenges,
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
