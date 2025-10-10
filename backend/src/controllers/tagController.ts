import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Tag from "../models/Tag";
import { parseWithZod } from "../utils/zodUtils";
import { executeTagJobsSchema, getTagSchema } from "../validation/tagsSchema";

const executeTagJobs = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(executeTagJobsSchema, req);
    const { tags, action } = body;

    if (action === "create") {
        await Tag.getOrCreateTagsByNames(tags);
    } else if (action === "delete") {
        await Tag.deleteMany({ name: { $in: tags } });
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
    const tags = await Tag.find().sort({ name: 1 }).select("name");

    res.json(tags);
});

const getTag = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getTagSchema, req);
    const { tagName } = body;

    const tag = await Tag.findOne({ name: tagName }).select("name _id");

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