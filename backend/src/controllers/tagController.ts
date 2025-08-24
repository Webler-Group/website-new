import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Tag from "../models/Tag";

/**
 * REQUIRES AUTH AND ROLES ["Admin", "Moderator"]
 * Create a tag if not exists. This controller does not try to recreate an existing tag
 * 
 * body: {
 *  tags: Array of tags,
 *  action: "create" / "delete"
 * }
 */
const executeTagJobs = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { tags, action } = req.body;
    const roles = req.roles;

    const isModerator = roles && roles.some(role => ["Moderator", "Admin"].includes(role));

    if(!isModerator) {
        res.status(403).json({ message: "Unauthorized Access" });
        return;
    }

    if(tags.length < 1 || !(typeof action == "string") || action == "" ) {
        res.status(200).json({ message: "0 job done" });
        return;
    }

    const p_action = action.toLowerCase().trim();
    for(let name of tags) {
        if(p_action == "create")
            await Tag.getOrCreateTagByName(name);
        if(p_action == "delete") 
            await Tag.deleteOne({ name });
    }
    
    res.status(200).json({ message: `${tags.length} job ${p_action}d!` });
});


const getTagList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const tags = await Tag.find().sort({ name: 1 }).select("name");

    if(!tags) {
        res.status(500).json({ message: "Tags could not be retrieved" });
        return;
    }

    res.status(200).json(tags);
});


const getTag = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { tagName } = req.body;

    const tag = await Tag.findOne({ name: tagName }).select("name _id");

    if (!tag) {
        res.status(404).json({ message: "Tag not found" });
        return
    }

    res.status(200).json({ name: tag.name });
});


const controller = {
    executeTagJobs,
    getTagList,
    getTag
}

export default controller;