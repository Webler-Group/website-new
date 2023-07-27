import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Question from "../models/Question";

const createQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {

});

const getQuestions = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const query = req.query;
    const currentUserId = req.userId;

    if (typeof query.page !== "string" || typeof query.count !== "string" || typeof query.filter !== "string") {
        res.status(400).json({ message: "Invalid query params" });
        return
    }

    const page = parseInt(query.page);
    const count = parseInt(query.count);
    const filter = parseInt(query.filter);
    const queryString = typeof query.query !== "string" ? "" : query.query;
    const userId = typeof query.profileId !== "string" ? null : query.profileId;

    let dbQuery = Question.find({

    });

    switch (filter) {
        // Most Recent
        case 0: {
            dbQuery = dbQuery
                .sort({ createdAt: "desc" })
            break;
        }
        // My Questions
        case 1: {
            if (userId === null) {
                res.status(400).json({ message: "Invalid query params" });
                return
            }
            dbQuery = dbQuery
                .where("user").equals(userId)
                .sort({ createdAt: "desc" })
            break;
        }
        default:
            throw new Error("Unknown filter");
    }

    const result = await dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles") as any[];

    const postCount = await dbQuery.countDocuments();

    if (result) {
        const data = result.map(x => ({
            id: x._id,
            title: x.title,
            message: x.message,
            tags: x.tags,
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles
        }));

        res.status(500).json({ count: postCount, posts: data });
    }
    else {
        res.status(500).json({});
    }

});

const discussController = {
    createQuestion,
    getQuestions
}

export default discussController;