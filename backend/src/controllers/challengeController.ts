import { Response } from "express";
import Challenge from "../models/Challenge";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import { escapeRegex } from "../utils/regexUtils";


const createChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
      const { title, description, difficulty, tags, testCases, xp } = req.body;

      if(!title || !description || !difficulty || !tags || testCases.length < 1 || !xp) {
        res.status(400).json({ success: false, message: "One or more required field is missing" });
        return;
      }

      const challenge = await Challenge.create({
        title,
        description,
        difficulty,
        tags,
        testCases,
        xp,
        createdBy: req.userId,
      });

      if(!challenge) {
        res.status(400).json({ success: false, message: "Failed to create this challenge" });
        return;
      }
        
      res.status(201).json({ success: true, challenge });
})


const getChallengeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { page, count, filter, searchQuery } = req.body;
    const currentUserId = req.userId;

    if (typeof page !== "number" || page < 1 || typeof count !== "number" || count < 1 || count > 100 || typeof filter === "undefined" || typeof searchQuery === "undefined") {
        res.status(400).json({ message: "Invalid body" });
        return;
    }

    const safeQuery = escapeRegex(searchQuery.trim());
    const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");

    const skip = (page - 1) * count;
    const limit = parseInt(count.toString());

    const query: any = {};

    if (filter.difficulty) {
      query.difficulty = { $in: filter.difficulty }; //  ["easy", "hard"]
    }

    if (searchQuery) {
      query.$or = [
        { title: { $regex: safeQuery, $options: "i" } },
        { tags: { $in: [searchRegex] } },
      ];
    }

    let challenges = await Challenge.find(query)
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(limit)
      .lean(); 

    if(!challenges) {
        res.status(500).json({ error: "Server error while fetching challenges" });
        return;
    }
    
    if (currentUserId) {
      // const submissions = await Submission.find({ user: userId }).select("challenge status");
      // const solvedSet = new Set(
      //   submissions.filter((s) => s.status === "passed").map((s) => s.challenge.toString())
      // );

      // challenges = challenges.map((ch) => ({
      //   ...ch,
      //   solved: solvedSet.has(ch._id.toString()),
      // }));

      // if (filter.solved !== undefined) {
      //   challenges = challenges.filter((ch) => ch.solved === filter.solved);
      // }
    }

    const total = await Challenge.countDocuments(query);

    res.json({
      page,
      count: challenges.length,
      total,
      challenges,
    });
})


const getChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { challengeId } = req.body;
    const challenge = await Challenge.findById(challengeId)
      .select("tags testCases title description xp");
    if (!challenge) {
      res.status(404).json({ success: false, message: "Challenge not found" });
      return;
    }
    res.json({ success: true, challenge });
})


const searchByTag = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { tag } = req.query;
    const challenges = await Challenge.searchByTag(tag as string);
    res.json({ success: true, challenges });
})


const ChallengeController = {
  createChallenge,
  getChallengeList,
  getChallenge
};

export default ChallengeController;