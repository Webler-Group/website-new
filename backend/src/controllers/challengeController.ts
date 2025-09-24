import { Response } from "express";
import Challenge, { IChallenge, IChallengeTemplate } from "../models/Challenge";
import { IAuthRequest } from "../middleware/verifyJWT";
import asyncHandler from "express-async-handler";
import { escapeRegex } from "../utils/regexUtils";
import User from "../models/User";
import RolesEnum from "../data/RolesEnum";
import { createChallengeSchema, getChallengeListSchema, getChallengeSchema } from "../validation/challengeSchema";
import { parseWithZod } from "../utils/zodUtils";
import { PipelineStage } from "mongoose";



const createChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
      const { body } = parseWithZod(createChallengeSchema, req);
      const { title, description, difficulty, testCases, xp, templates } = body;

      const challenge = await Challenge.create({
        title,
        description,
        difficulty,
        testCases,
        xp,
        templates,
        author: req.userId,
      });

      if(!challenge) {
        res.status(400).json({ success: false, message: "Failed to create this challenge" });
        return;
      }
        
      res.status(201).json({ success: true, challenge: { id: challenge._id }});
})


const getChallengeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeListSchema, req);
    const { page, count, filter, searchQuery } = body;

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

    //@todo query for solved and unsolved right here
    
    switch (filter) {
        // Most Recent
        case 1: {
            pipeline.push({
                $sort: { createdAt: -1 }
            })
            dbQuery = dbQuery
                .sort({ createdAt: "desc" })
            break;
        }
        // easy
        case 2: {
            pipeline.push({
                $match: { difficulty: "easy" }
            }, {
                $sort: { createdAt: -1 }
            })
            dbQuery = dbQuery
                .where({ difficulty: "easy" })
                .sort({ createdAt: "desc" })
            break;
        }
        // medium
        case 3: {
            pipeline.push({
                $match: { difficulty: "medium" }
            }, {
                $sort: { createdAt: -1 }
            })
            dbQuery = dbQuery
                .where({ difficulty: "medium" })
                .sort({ createdAt: "desc" })
            break;
        }
        // hard
        case 4: {
            pipeline.push({
                $match: { difficulty: "hard" }
            }, {
                $sort: { createdAt: -1 }
            })
            dbQuery = dbQuery
                .where({ difficulty: "hard" })
                .sort({ createdAt: "desc" })
            break;
        }
          
          default:
              res.status(400).json({ error: [{ message: "Unknown filter" }] });
              return;
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
            difficulty: x.difficulty,
            xp: x.xp
        }));
    
        // let promises = [];
    
        // for (let i = 0; i < data.length; ++i) {
        //     if (currentUserId) {
        //         promises.push(Upvote.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
        //             data[i].isUpvoted = !(upvote === null);
        //         }));
        //     }
        // }
    
        // await Promise.all(promises);
    
        res.status(200).json({ count: challengeCount, challenges: data });
})


const getChallenge = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await Challenge.findById(challengeId)
      .populate<{templates: IChallengeTemplate}>("templates", "name source")
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


const isChallengeAuthor = async (challenge: IChallenge, userId: string) => {
  const user = await User.findById(userId);

  if (challenge.author?.toString() != userId || !(user && user.roles.includes(RolesEnum.ADMIN)))
    return false;
  
  return true;
}


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
    const { body } = parseWithZod(getChallengeSchema, req);
    const { challengeId } = body;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      res.status(404).json({ success: false, message: "Challenge not found" });
      return;
    }

    if (!(await isChallengeAuthor(challenge, req.userId as string))) {
      res.status(401).json({ message: "Author Mismatch" });
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