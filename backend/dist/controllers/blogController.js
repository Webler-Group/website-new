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
const rootDir = process.env.ROOT_DIR;
const blogsDir = path_1.default.join(rootDir, "uploads", "blogs");
const getBlogEntries = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.query;
    const page = Number(query.page);
    const count = Number(query.count);
    const searchQuery = typeof query.query !== "string" ? "" : query.query.trim();
    if (!Number.isInteger(page) || !Number.isInteger(count)) {
        res.status(400).json({ message: "Invalid query params" });
        return;
    }
    const regex = new RegExp("^" + searchQuery, "i");
    let postCount = 0;
    let posts = [];
    if (fs_1.default.existsSync(blogsDir)) {
        let names = fs_1.default.readdirSync(blogsDir);
        console.log(names);
        posts = names.map(name => {
            const fileData = fs_1.default.readFileSync(path_1.default.join(blogsDir, name, "info.json"));
            const json = JSON.parse(fileData.toString());
            return json;
        });
        if (searchQuery.length) {
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
    const entryName = req.params.entryName;
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
