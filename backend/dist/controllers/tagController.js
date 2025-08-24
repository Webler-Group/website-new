"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Tag_1 = __importDefault(require("../models/Tag"));
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
    getTagList,
    getTag
};
exports.default = controller;
