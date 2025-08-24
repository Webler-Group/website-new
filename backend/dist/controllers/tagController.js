"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Tag_1 = __importDefault(require("../models/Tag"));
/**
 * REQUIRES AUTH AND ROLES ["Admin", "Moderator"]
 * Create a tag if not exists. This controller does not try to recreate an existing tag
 *
 * body: {
 *  tags: Array of tags,
 *  action: "create" / "delete"
 * }
 */
const executeTagJobs = (0, express_async_handler_1.default)(async (req, res) => {
    const { tags, action } = req.body;
    const roles = req.roles;
    if (tags.length < 1 || !(typeof action == "string") || action == "") {
        res.status(200).json({ message: "0 job done" });
        return;
    }
    const p_action = action.toLowerCase().trim();
    for (let name of tags) {
        if (p_action == "create")
            await Tag_1.default.getOrCreateTagByName(name);
        if (p_action == "delete")
            await Tag_1.default.deleteOne({ name });
    }
    res.status(200).json({ message: `${tags.length} job ${p_action}d!` });
});
const getTagList = (0, express_async_handler_1.default)(async (req, res) => {
    const tags = await Tag_1.default.find().sort({ name: 1 }).select("name");
    if (!tags) {
        res.status(500).json({ message: "Tags could not be retrieved" });
        return;
    }
    res.status(200).json(tags);
});
const getTag = (0, express_async_handler_1.default)(async (req, res) => {
    const { tagName } = req.body;
    const tag = await Tag_1.default.findOne({ name: tagName }).select("name _id");
    if (!tag) {
        res.status(404).json({ message: "Tag not found" });
        return;
    }
    res.status(200).json({ name: tag.name });
});
const controller = {
    executeTagJobs,
    getTagList,
    getTag
};
exports.default = controller;
