import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import TagModel from "../models/Tag";
import { parseWithZod } from "../utils/zodUtils";
import { executeTagJobsSchema, getTagSchema } from "../validation/tagsSchema";
import { getOrCreateTagsByNames } from "../helpers/tagsHelper";

const executeTagJobs = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(executeTagJobsSchema, req);
    const { tags, action } = body;

    if (action === "create") {
        await getOrCreateTagsByNames(tags);
    } else if (action === "delete") {
        await TagModel.deleteMany({ name: { $in: tags } });
    } else {
        res.status(400).json({ success: false, message: "Invalid action" });
        return;
    }

    res.json({
        success: true,
        message: action == "create" ? "Tags created successfully" : "Tags deleted successfully"
    });
});

const getTagList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const tags = await TagModel.find().sort({ name: 1 }).lean();

    res.json(tags);
});

const getTag = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getTagSchema, req);
    const { tagName } = body;

    const tag = await TagModel.findOne({ name: tagName }).lean();

    if (!tag) {
        res.status(404).json({ error: [{ message: "Tag not found" }] });
        return;
    }

    res.json({
        success: true,
        tag: { name: tag.name, id: tag._id }
    });
});

const controller = {
    executeTagJobs,
    getTagList,
    getTag
}

export default controller;