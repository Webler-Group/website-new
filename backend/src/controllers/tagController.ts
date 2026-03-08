import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import TagModel from "../models/Tag";
import { parseWithZod } from "../utils/zodUtils";
import { executeTagJobsSchema, getTagSchema } from "../validation/tagsSchema";
import { getOrCreateTagsByNames } from "../helpers/tagsHelper";
import HttpError from "../exceptions/HttpError";

const executeTagJobs = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(executeTagJobsSchema, req);
    const { tags, action } = body;

    if (action === "create") {
        await getOrCreateTagsByNames(tags);
    } else if (action === "delete") {
        await TagModel.deleteMany({ name: { $in: tags } });
    }

    res.json({
        success: true
    });
});

const getTagList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const tags = await TagModel.find().sort({ name: 1 }).lean();

    res.json({
        success: true,
        data: {
            tags
        }
    });
});

const getTag = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getTagSchema, req);
    const { tagName } = body;

    const tag = await TagModel.findOne({ name: tagName }).lean();

    if (!tag) {
        throw new HttpError("Tag not found", 404);
    }

    res.json({
        success: true,
        data: {
            tag: { name: tag.name, id: tag._id }
        }
    });
});

const controller = {
    executeTagJobs,
    getTagList,
    getTag
}

export default controller;