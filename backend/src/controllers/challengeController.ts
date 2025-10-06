import { Response } from "express";
import Challenge from "../models/Challenge";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import { escapeRegex } from "../utils/regexUtils";
import User from "../models/User";
import RolesEnum from "../data/RolesEnum";
import { createChallengeSchema, editChallengeSchema, getChallengeListSchema, getChallengeSchema } from "../validation/challengeSchema";
import { parseWithZod } from "../utils/zodUtils";
import { PipelineStage } from "mongoose";



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
    const { page, count, difficulty, status, searchQuery } = body;

    let pipeline: PipelineStage[] = [];

    let dbQuery = Challenge.find();

    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = escapeRegex(searchQuery.trim());
        const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");

        pipeline.push({
            $match: {
                $or: [
                    { title: searchRegex }
                ]
            }
        })

        dbQuery.where({
            $or: [
                { title: searchRegex }
            ]
        })
    }

    const challengeCount = await dbQuery.clone().countDocuments();

    pipeline.push({
        $skip: (page - 1) * count
    }, {
        $limit: count
    }, {
        $project: { description: 0 }
    }, {
        $lookup: { from: "users", localField: "user", foreignField: "_id", as: "users" }
    })

    const result = await Challenge.aggregate(pipeline);

    const data = result.map(x => ({
        id: x._id,
        title: x.title,
        difficulty: x.difficulty
    }));

    res.json({ count: challengeCount, challenges: data });
});

const getChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await Challenge.findById(challengeId)
        .populate<{ templates: any }>("templates", "name source")
        .select("title description xp author");

    if (!challenge) {
        res.status(404).json({ success: false, message: "Challenge not found" });
        return;
    }

    res.json({ success: true, challenge });
})

const getChallengeInfo = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        res.status(404).json({ success: false, message: "Challenge not found" });
        return;
    }

    res.json({ success: true, challenge });
})

const editChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editChallengeSchema, req);
    const { challengeId, title, description, difficulty, testCases, templates } = body;
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        res.status(404).json({ success: false, message: "Challenge not found" });
        return;
    }

    challenge.title = title;
    challenge.description = description;
    challenge.difficulty = difficulty;
    challenge.testCases = testCases;
    challenge.templates = templates;

    await challenge.save();
    res.json({ success: true, challenge });
});


const deleteChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;
    const currentUserId = req.userId;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
        res.status(404).json({ success: false, message: "Challenge not found" });
        return;
    }

    await Challenge.findByIdAndDelete(challengeId);

    res.json({ success: true, message: "Challenge and related submissions deleted" });
})


const ChallengeController = {
    createChallenge,
    getChallengeList,
    getChallenge,
    getChallengeInfo,
    editChallenge,
    deleteChallenge
};

export default ChallengeController;