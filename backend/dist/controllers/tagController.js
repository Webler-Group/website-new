"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Tag_1 = __importDefault(require("../models/Tag"));
const getTagList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tags = yield Tag_1.default.find().sort({ name: 1 }).select("name");
    if (!tags) {
        res.status(500).json({ message: "Tags could not be retrieved" });
        return;
    }
    res.status(200).json(tags);
}));
const getTag = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tagName } = req.body;
    const tag = yield Tag_1.default.findOne({ name: tagName }).select("name _id");
    if (!tag) {
        res.status(404).json({ message: "Tag not found" });
        return;
    }
    res.status(200).json({ name: tag.name });
}));
const controller = {
    getTagList,
    getTag
};
exports.default = controller;
