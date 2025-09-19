import { Response } from "express";
import Challenge, { IChallenge, IChallengeTemplate } from "../models/Challenge";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import { escapeRegex } from "../utils/regexUtils";
import User from "../models/User";
import RolesEnum from "../data/RolesEnum";



const isChallengeAuthor = async (challenge: IChallenge, userId: string) => {
  const user = await User.findById(userId);

  if (challenge.createdBy?.toString() != userId || !(user && user.roles.includes(RolesEnum.ADMIN)))
    return false;

  return true;
}


const createChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
      const { title, description, difficulty, testCases, xp, templates } = req.body;

      if(!title || !description || !difficulty || testCases.length < 1 || !xp || templates.length < 1) {
        res.status(400).json({ success: false, message: "One or more required field is missing" });
        return;
      }

      const challenge = await Challenge.create({
        title,
        description,
        difficulty,
        testCases,
        xp,
        templates,
        createdBy: req.userId,
      });

      if(!challenge) {
        res.status(400).json({ success: false, message: "Failed to create this challenge" });
        return;
      }
        
      res.status(201).json({ success: true, challenge: { id: challenge._id }});
})


const getChallengeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { page, count, filter, searchQuery } = req.body;
    const currentUserId = req.userId;

    if (typeof page !== "number" || page < 1 || typeof count !== "number" || count < 1 || count > 100 || typeof filter === "undefined" || typeof searchQuery === "undefined") {
        res.status(400).json({ message: "Invalid body" });
        return
    }

    const safeQuery = escapeRegex(searchQuery.trim());
    const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");

    const skip = (page - 1) * count;
    const limit = parseInt(count.toString());

    const query: any = {};

    let filterValue = "";
    switch(filter) {
        case 1:
          filterValue = "easy";
          break;
        case 2:
          filterValue = "medium";
          break;
        case 3:
          filterValue = "hard";
          break;
        default:
          filterValue = "";
          break;
    }

    query.difficulty = { $in: filterValue };
    
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
      .lean()
      .select("title xp difficulty");

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
      items: challenges,
    });
})


const getChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { challengeId } = req.body;
    const challenge = await Challenge.findById(challengeId)
      .populate<{templates: IChallengeTemplate}>("templates", "name source")
      .select("tags title description xp createdBy");

    if (!challenge) {
      res.status(404).json({ success: false, message: "Challenge not found" });
      return;
    }

    res.json({ success: true, challenge });
})



const getChallengeInfo = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { challengeId } = req.body;
    const challenge = await Challenge.findById(challengeId)
   
    if (!challenge) {
      res.status(404).json({ success: false, message: "Challenge not found" });
      return;
    }

    res.json({ success: true, challenge });
})


const editChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { challengeId, title, description, difficulty, testCases, xp, templates } = req.body;
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      res.status(404).json({ success: false, message: "Challenge not found" });
      return;
    }


    if (!(await isChallengeAuthor(challenge, req.userId as string))) {
      res.status(401).json({ message: "Author Mismatch" })
      return;
    }

   

    if(!title || !description || !difficulty || testCases.length < 1 || !xp || templates.length < 1) {
      res.status(400).json({ success: false, message: "One or more required field is missing" });
      return;
    }

    challenge.title = title;
    challenge.description = description;
    challenge.difficulty = difficulty;
    challenge.testCases = testCases;
    challenge.xp = xp;
    challenge.templates = templates;

    try {
        await challenge.save();
        res.json({ success: true, challenge });
    } catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
});


const deleteChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { challengeId } = req.body;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      res.status(404).json({ success: false, message: "Challenge not found" });
      return;
    }

    if (challenge === null) {
      res.status(404).json({ message: "Challenge not found" })
      return;
    }

    if (!(await isChallengeAuthor(challenge, req.userId as string))) {
      res.status(401).json({ message: "Author Mismatch" })
      return;
    }

    await Challenge.findByIdAndDelete(challengeId);

    res.status(200).json({ success: true, message: "Challenge and related submissions deleted" });
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