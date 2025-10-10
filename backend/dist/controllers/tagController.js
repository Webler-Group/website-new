"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Tag_1 = __importDefault(require("../models/Tag"));
const zodUtils_1 = require("../utils/zodUtils");
const tagsSchema_1 = require("../validation/tagsSchema");
const executeTagJobs = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(tagsSchema_1.executeTagJobsSchema, req);
    const { tags, action } = body;
    if (action === "create") {
        await Tag_1.default.getOrCreateTagsByNames(tags);
    }
    else if (action === "delete") {
        await Tag_1.default.deleteMany({ name: { $in: tags } });
    }
    else {
        res.status(400).json({ success: false, message: "Invalid action" });
        return;
    }
    res.json({
        success: true,
        message: action == "create" ? "Tags created successfully" : "Tags deleted successfully"
    });
});
const getTagList = (0, express_async_handler_1.default)(async (req, res) => {
    const tags = await Tag_1.default.find().sort({ name: 1 }).select("name");
    res.json(tags);
});
const getTag = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(tagsSchema_1.getTagSchema, req);
    const { tagName } = body;
    const tag = await Tag_1.default.findOne({ name: tagName }).select("name _id");
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
};
exports.default = controller;
