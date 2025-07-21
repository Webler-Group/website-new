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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const showdown_1 = __importDefault(require("showdown"));
const confg_1 = require("../confg");
const blogsDir = path_1.default.join(confg_1.config.rootDir, "uploads", "blogs");
const getBlogEntries = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, count, searchQuery } = req.body;
    if (typeof page === "undefined" || typeof count === "undefined" || typeof searchQuery === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    let postCount = 0;
    let posts = [];
    if (fs_1.default.existsSync(blogsDir)) {
        let names = fs_1.default.readdirSync(blogsDir);
        posts = names.map(name => {
            const fileData = fs_1.default.readFileSync(path_1.default.join(blogsDir, name, "info.json"));
            const json = JSON.parse(fileData.toString());
            return json;
        });
        if (searchQuery.trim().length) {
            const regex = new RegExp("^" + searchQuery.trim(), "i");
            posts = posts.filter(post => {
                return regex.test(post.title);
            });
        }
        postCount = posts.length;
        posts = posts.slice((page - 1) * count, page * count);
    }
    res.json({
        posts,
        count: postCount
    });
}));
const getBlogEntry = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { entryName } = req.body;
    try {
        const jsonFileData = fs_1.default.readFileSync(path_1.default.join(blogsDir, entryName, 'info.json'));
        const json = JSON.parse(jsonFileData.toString());
        const fileData = fs_1.default.readFileSync(path_1.default.join(blogsDir, entryName, 'content.md'));
        const converter = new showdown_1.default.Converter();
        const text = fileData.toString();
        const html = converter.makeHtml(text);
        res.json({
            blog: {
                title: json.title,
                content: html
            }
        });
    }
    catch (e) {
        res.status(404)
            .json({
            message: "Blog not found"
        });
    }
}));
const controller = {
    getBlogEntries,
    getBlogEntry
};
exports.default = controller;
