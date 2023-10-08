import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Code from "../models/Code";
import Upvote from "../models/Upvote";
import templates from "../data/templates";
import Post from "../models/Post";
import fs from 'fs';
import { execSync } from 'child_process';
import { bundle } from "../utils/bundler";
import path from "path";

const createCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { name, language, source, cssSource, jsSource } = req.body;
    const currentUserId = req.userId;

    if (typeof name === "undefined" || typeof language === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const code = await Code.create({
        name,
        language,
        user: currentUserId,
        source,
        cssSource,
        jsSource
    })

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

});

const getCodeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
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
        return
    }

    let dbQuery = Code.find({})

    if (searchQuery.length) {
        dbQuery.where({
            $or: [
                { name: new RegExp("^" + searchQuery, "i") }
            ]
        })
    }

    if (language.length) {
        dbQuery.where({ language });
    }

    switch (filter) {
        // Most Recent
        case 1: {
            dbQuery = dbQuery
                .where({ isPublic: true })
                .sort({ createdAt: "desc" })
            break;
        }
        // Most popular
        case 2: {
            dbQuery = dbQuery
                .where({ isPublic: true })
                .sort({ votes: "desc" })
            break;
        }
        // My Codes
        case 3: {
            if (userId === null) {
                res.status(400).json({ message: "Invalid query params" });
                return
            }
            if (userId !== currentUserId) {
                dbQuery = dbQuery.where({ isPublic: true });
            }
            dbQuery = dbQuery
                .where({ user: userId })
                .sort({ createdAt: "desc" })
            break;
        }
        // Hot Today
        case 5: {
            let dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            dbQuery = dbQuery
                .where({ createdAt: { $gt: dayAgo }, isPublic: true })
                .sort({ votes: "desc" })
            break;
        }
        default:
            throw new Error("Unknown filter");
    }

    const codeCount = await dbQuery.clone().countDocuments();

    const result = await dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .select("-source -cssSource -jsSource")
        .populate("user", "name avatarUrl countryCode level roles") as any[];

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
            isPublic: x.isPublic
        }));

        let promises = [];

        for (let i = 0; i < data.length; ++i) {
            if (currentUserId) {
                promises.push(Upvote.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                    data[i].isUpvoted = !(upvote === null);
                }));
            }
        }

        await Promise.all(promises);

        res.status(200).json({ count: codeCount, codes: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});

const getCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const codeId = req.params.codeId;

    const code = await Code.findById(codeId)
        .populate("user", "name avatarUrl countryCode level roles") as any;

    if (code) {

        const isUpvoted = currentUserId ? await Upvote.findOne({ parentId: codeId, user: currentUserId }) : false;

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
        res.status(404).json({ message: "Question not found" })
    }
});

const getTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const language = req.params.language;

    const template = templates.find(x => x.language === language);
    if (template) {
        res.json({
            template
        });
    }
    else {
        res.status(404).json({ message: "Unknown language" })
    }
});

const editCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { codeId, name, isPublic, source, cssSource, jsSource } = req.body;

    if (typeof name === "undefined" || typeof isPublic === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" })
        return
    }

    const code = await Code.findById(codeId);

    if (code === null) {
        res.status(404).json({ message: "Code not found" })
        return
    }

    if (currentUserId != code.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    code.name = name;
    code.isPublic = isPublic;
    code.source = source;
    code.cssSource = cssSource;
    code.jsSource = jsSource;

    try {
        await code.save();

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
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        })
    }
});

const deleteCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { codeId } = req.body;

    const code = await Code.findById(codeId);

    if (code === null) {
        res.status(404).json({ message: "Code not found" })
        return
    }

    if (currentUserId != code.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    try {

        await Post.deleteAndCleanup({ codeId: codeId });
        await Upvote.deleteMany({ parentId: codeId });
        await Code.deleteOne({ _id: codeId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

const voteCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { codeId, vote } = req.body;

    if (typeof vote === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const code = await Code.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" })
        return
    }

    let upvote = await Upvote.findOne({ parentId: codeId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = await Upvote.create({ user: currentUserId, parentId: codeId })
            code.votes += 1;
        }
    }
    else if (vote === 0) {
        if (upvote) {
            await Upvote.deleteOne({ _id: upvote._id });
            upvote = null;
            code.votes -= 1;
        }
    }

    await code.save();

    res.json({ vote: upvote ? 1 : 0 });

})

const compile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const fileSuffixes: { [index: string]: string } = {
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
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    const subDir = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const dirPath = `${dir}/${subDir}`;
    fs.mkdirSync(dirPath);

    //create main source file
    const sourceFileName = `main.${fileSuffix}`;
    const sourcePath = `${dirPath}/${sourceFileName}`;
    fs.writeFileSync(sourcePath, source);

    //creat htmlTemplate file
    const templatePath = `${dirPath}/main.html`;
    const templateContent = `
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
#output{
    padding-left: 0;
    padding-right: 0;
    margin-left: auto;
    margin-right: auto;
    display: block;
    color: lime;
    background-color: black;
    width: 80ch;
}
canvas {
    padding-left: 0;
    padding-right: 0;
    margin-left: auto;
    margin-right: auto;
    display: block;
    width: 61vw;
    font-family: mono;
}
    </style>
</head>

<body>

    <canvas width=0 height=0 id="canvas" oncontextmenu="event.preventDefault()"></canvas>
    <hr>
    <pre id="output"></pre>
    <script type='text/javascript'>
        var Module = {
            print: (function(){
                      var output = document.querySelector("#output");
                      if(output) output.innerText = "";
                      return (function(text){
                               if(output)
                               output.innerText += text + "\\n";
                               console.log(text)
                             })
                    })(),
            canvas: (function() { return document.getElementById('canvas'); })(),
            wasmBinary: (function(){return {{{ WASMBIN }}} })()
        };
    </script>
    {{{ SCRIPT }}}

</body>

</html>

`;
    fs.writeFileSync(templatePath, templateContent);

    //create Makefile
    const makefileString = `
all: main

main: ${sourceFileName}
	emcc ${sourceFileName} -s USE_SDL=2 -s USE_SDL_IMAGE=2 -s SDL2_IMAGE_FORMATS='["bmp", "png", "xpm", "jpg"]' -s FETCH=1 -s USE_SDL_TTF=2 -o main.js

`;
    fs.writeFileSync(`${dirPath}/Makefile`, makefileString);
    //run make
    execSync(`(cd ${dirPath} && make)`);


    //use bundler to create a web/html bundle of all emscripten files
    const bundleString = bundle(`${dirPath}/main.html`, `${dirPath}/main.js`, `${dirPath}/main.wasm`);


    //delete compiled files


    //return bundle
    res.json({ compiledHTML: bundleString });

})

const codesController = {
    createCode,
    getCodeList,
    getCode,
    getTemplate,
    editCode,
    deleteCode,
    voteCode,
    compile
}

export default codesController
