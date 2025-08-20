import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Tag from "../models/Tag";



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
    getTagList,
    getTag
}

export default controller;