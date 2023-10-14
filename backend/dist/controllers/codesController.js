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
const Code_1 = __importDefault(require("../models/Code"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const templates_1 = __importDefault(require("../data/templates"));
const Post_1 = __importDefault(require("../models/Post"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const bundler_1 = require("../utils/bundler");
const createCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, language, source, cssSource, jsSource } = req.body;
    const currentUserId = req.userId;
    if (typeof name === "undefined" || typeof language === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const code = yield Code_1.default.create({
        name,
        language,
        user: currentUserId,
        source,
        cssSource,
        jsSource
    });
    if (code) {
        res.json({
            code: {
                id: code._id,
                name: code.name,
                language: code.language,
                date: code.createdAt,
                userId: code.user,
                votes: code.votes,
                comments: code.comments,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource,
                isPublic: code.isPublic
            }
        });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
}));
const getCodeList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.query;
    const currentUserId = req.userId;
    const page = Number(query.page);
    const count = Number(query.count);
    const filter = Number(query.filter);
    const searchQuery = typeof query.query !== "string" ? "" : query.query.trim();
    const userId = typeof query.profileId !== "string" ? null : query.profileId;
    const language = typeof query.language !== "string" ? "" : query.language;
    if (!Number.isInteger(page) || !Number.isInteger(count) || !Number.isInteger(filter)) {
        res.status(400).json({ message: "Invalid query params" });
        return;
    }
    let dbQuery = Code_1.default.find({});
    if (searchQuery.length) {
        dbQuery.where({
            $or: [
                { name: new RegExp("^" + searchQuery, "i") }
            ]
        });
    }
    if (language.length) {
        dbQuery.where({ language });
    }
    switch (filter) {
        // Most Recent
        case 1: {
            dbQuery = dbQuery
                .where({ isPublic: true })
                .sort({ createdAt: "desc" });
            break;
        }
        // Most popular
        case 2: {
            dbQuery = dbQuery
                .where({ isPublic: true })
                .sort({ votes: "desc" });
            break;
        }
        // My Codes
        case 3: {
            if (userId === null) {
                res.status(400).json({ message: "Invalid query params" });
                return;
            }
            if (userId !== currentUserId) {
                dbQuery = dbQuery.where({ isPublic: true });
            }
            dbQuery = dbQuery
                .where({ user: userId })
                .sort({ createdAt: "desc" });
            break;
        }
        // Hot Today
        case 5: {
            let dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            dbQuery = dbQuery
                .where({ createdAt: { $gt: dayAgo }, isPublic: true })
                .sort({ votes: "desc" });
            break;
        }
        default:
            throw new Error("Unknown filter");
    }
    const codeCount = yield dbQuery.clone().countDocuments();
    const result = yield dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .select("-source -cssSource -jsSource")
        .populate("user", "name avatarUrl countryCode level roles");
    if (result) {
        const data = result.map(x => ({
            id: x._id,
            name: x.name,
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles,
            comments: x.comments,
            votes: x.votes,
            isUpvoted: false,
            isPublic: x.isPublic,
            language: x.language
        }));
        let promises = [];
        for (let i = 0; i < data.length; ++i) {
            if (currentUserId) {
                promises.push(Upvote_1.default.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                    data[i].isUpvoted = !(upvote === null);
                }));
            }
        }
        yield Promise.all(promises);
        res.status(200).json({ count: codeCount, codes: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }
}));
const getCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const codeId = req.params.codeId;
    const code = yield Code_1.default.findById(codeId)
        .populate("user", "name avatarUrl countryCode level roles");
    if (code) {
        const isUpvoted = currentUserId ? yield Upvote_1.default.findOne({ parentId: codeId, user: currentUserId }) : false;
        res.json({
            code: {
                id: code._id,
                name: code.name,
                language: code.language,
                date: code.createdAt,
                userId: code.user._id,
                userName: code.user.name,
                avatarUrl: code.user.avatarUrl,
                countryCode: code.user.countryCode,
                level: code.user.level,
                roles: code.user.roles,
                comments: code.comments,
                votes: code.votes,
                isUpvoted,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource,
                isPublic: code.isPublic
            }
        });
    }
    else {
        res.status(404).json({ message: "Question not found" });
    }
}));
const getTemplate = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const language = req.params.language;
    const template = templates_1.default.find(x => x.language === language);
    if (template) {
        res.json({
            template
        });
    }
    else {
        res.status(404).json({ message: "Unknown language" });
    }
}));
const editCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId, name, isPublic, source, cssSource, jsSource } = req.body;
    if (typeof name === "undefined" || typeof isPublic === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const code = yield Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    if (currentUserId != code.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    code.name = name;
    code.isPublic = isPublic;
    code.source = source;
    code.cssSource = cssSource;
    code.jsSource = jsSource;
    try {
        yield code.save();
        res.json({
            success: true,
            data: {
                id: code._id,
                name: code.name,
                isPublic: code.isPublic,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
}));
const deleteCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId } = req.body;
    const code = yield Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    if (currentUserId != code.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        yield Post_1.default.deleteAndCleanup({ codeId: codeId });
        yield Upvote_1.default.deleteMany({ parentId: codeId });
        yield Code_1.default.deleteOne({ _id: codeId });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
}));
const voteCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { codeId, vote } = req.body;
    if (typeof vote === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const code = yield Code_1.default.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    let upvote = yield Upvote_1.default.findOne({ parentId: codeId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = yield Upvote_1.default.create({ user: currentUserId, parentId: codeId });
            code.votes += 1;
        }
    }
    else if (vote === 0) {
        if (upvote) {
            yield Upvote_1.default.deleteOne({ _id: upvote._id });
            upvote = null;
            code.votes -= 1;
        }
    }
    yield code.save();
    res.json({ vote: upvote ? 1 : 0 });
}));
const compile = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fileSuffixes = {
        c: "c",
        cpp: "cpp",
    };
    const { source, language } = req.body;
    const fileSuffix = fileSuffixes[language];
    if (!fileSuffix) {
        res.json({ compiledHTML: "err" });
        return;
    }
    const dir = "./compiler";
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir);
    }
    const subDir = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const dirPath = `./compiler/${subDir}`;
    fs_1.default.mkdirSync(dirPath);
    //create main source file
    const sourceFileName = `main.${fileSuffix}`;
    const sourcePath = `${dirPath}/${sourceFileName}`;
    fs_1.default.writeFileSync(sourcePath, source);
    //creat htmlTemplate file
    const templatePath = `${dirPath}/main.html`;
    const templateContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
body {
    margin: 0;
    background: #000000;
    color: #CCCCCC;
    width: 100%;
}
#output{
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-all;
    font-size: 14px;
    font-family: monospace;
    padding: 5px;
}
#canvas {
    display: block;
    max-width: 100%;
}
    </style>
</head>
<body>
    <canvas width="0" height="0" id="canvas" oncontextmenu="event.preventDefault()"></canvas>
    <div id="output"></div>
    <script>

        var Module = {
            print: (function(){
                const output = document.querySelector("#output");
                if(output) output.innerText = "";
                return (function(text){
                    if(output) output.innerText += text + "\\n";
                    console.log(text);
                })
            })(),
            canvas: (function() { return document.getElementById('canvas'); })(),
            wasmBinary: (function(){return {{{ WASMBIN }}} })()
        }
    </script>
    {{{ SCRIPT }}}
</body>
</html>`;
    fs_1.default.writeFileSync(templatePath, templateContent);
    //create Makefile
    const makefileString = `
all: main

main: ${sourceFileName}
	emcc -O0 -o main.js -sUSE_SDL=2 -sFETCH=1 -sUSE_SDL_IMAGE=2 -s SDL2_IMAGE_FORMATS='["bmp","png","xpm", "jpg"]' -sUSE_SDL_TTF=2 -D PLATFORM_WEB ${sourceFileName}

`;
    fs_1.default.writeFileSync(`${dirPath}/Makefile`, makefileString);
    //run make
    (0, child_process_1.execSync)(`(cd ${dirPath} && make)`);
    //use bundler to create a web/html bundle of all emscripten files
    const bundleString = (0, bundler_1.bundle)(`${dirPath}/main.html`, `${dirPath}/main.js`, `${dirPath}/main.wasm`);
    //delete compiled files
    try {
        fs_1.default.rmSync(dirPath, { recursive: true });
    }
    catch (err) {
        console.log(err);
    }
    //return bundle
    res.json({ compiledHTML: bundleString });
}));
const codesController = {
    createCode,
    getCodeList,
    getCode,
    getTemplate,
    editCode,
    deleteCode,
    voteCode,
    compile
};
exports.default = codesController;
