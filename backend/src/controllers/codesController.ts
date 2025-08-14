import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Code from "../models/Code";
import Upvote from "../models/Upvote";
import templates from "../data/templates";
import EvaluationJob from "../models/EvaluationJob";
import { devRoom, getIO } from "../config/socketServer";
import { Socket } from "socket.io";

const createCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { name, language, source, cssSource, jsSource } = req.body;
    const currentUserId = req.userId;

    if (typeof name === "undefined" || typeof language === "undefined" || typeof source === "undefined" || typeof cssSource === "undefined" || typeof jsSource === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if (await Code.countDocuments({ user: currentUserId }) >= 500) {
        res.status(403).json({ message: "You already have max count of codes" })
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
                createdAt: code.createdAt,
                updatedAt: code.createdAt,
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
    const { page, count, filter, searchQuery, userId, language } = req.body;
    const currentUserId = req.userId;

    if (typeof page === "undefined" || typeof count === "undefined" || typeof filter === "undefined" || typeof searchQuery === "undefined" || typeof userId === "undefined" || typeof language === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    let dbQuery = Code.find({ hidden: false })

    if (searchQuery.trim().length > 2) {
        dbQuery.where({
            $or: [
                { name: new RegExp(`(^|\\b)${searchQuery.trim()}`, "i") }
            ]
        })
    }

    if (language !== "") {
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
                res.status(400).json({ message: "Invalid request" });
                return
            }
            if (userId !== currentUserId) {
                dbQuery = dbQuery.where({ isPublic: true });
            }
            dbQuery = dbQuery
                .where({ user: userId })
                .sort({ updatedAt: "desc" })
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
        .populate("user", "name avatarImage level roles") as any[];

    if (result) {
        const data = result.map(x => ({
            id: x._id,
            name: x.name,
            createdAt: x.createdAt,
            updatedAt: x.updatedAt,
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
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
    const { codeId } = req.body;

    const code = await Code.findById(codeId)
        .populate("user", "name avatarImage countryCode level roles") as any;

    if (code) {

        const isUpvoted = currentUserId ? await Upvote.findOne({ parentId: codeId, user: currentUserId }) : false;

        res.json({
            code: {
                id: code._id,
                name: code.name,
                language: code.language,
                createdAt: code.createdAt,
                updatedAt: code.updatedAt,
                userId: code.user._id,
                userName: code.user.name,
                userAvatar: code.user.avatarImage,
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
        await Code.deleteAndCleanup(codeId);

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
            code.$inc("votes", 1);
            await code.save();
        }
    }
    else if (vote === 0) {
        if (upvote) {
            await Upvote.deleteOne({ _id: upvote._id });
            upvote = null;
            code.$inc("votes", -1);
            await code.save();
        }
    }

    res.json({ vote: upvote ? 1 : 0 });
});

const createJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { language, source, stdin } = req.body;
    const deviceId = req.deviceId;

    const job = await EvaluationJob.create({
        language,
        source,
        stdin,
        deviceId
    });

    res.json({
        jobId: job._id
    });
});

const getJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { jobId } = req.body;

    const job = await EvaluationJob.findById(jobId).select("-source");
    if (!job) {
        res.status(404).json({ message: "Job does not exist" });
        return;
    }

    res.json({
        job: {
            id: job._id,
            deviceId: job.deviceId,
            status: job.status,
            language: job.language,
            stdin: job.stdin,
            stdout: job.stdout,
            stderr: job.stderr
        }
    });
});

const getJobWS = async (socket: Socket, payload: any) => {
    const { jobId } = payload;

    const job = await EvaluationJob.findById(jobId).select("-source");    
    if (!job) {
        console.log("404 Job " + jobId + " not found");
        return;
    }

    console.log("Job " + jobId + " finished with status: " + job.status);

    socket.to(devRoom(job.deviceId)).emit("job:get", {
        job: {
            id: job._id,
            deviceId: job.deviceId,
            status: job.status,
            language: job.language,
            stdin: job.stdin,
            stdout: job.stdout,
            stderr: job.stderr
        }
    });
}

const registerHandlersWS = (socket: Socket) => {

    if(socket.data.roles && socket.data.roles.includes("Admin")) {
        socket.on("job:finished", (payload) => getJobWS(socket, payload));
    }
}

const codesController = {
    createCode,
    getCodeList,
    getCode,
    getTemplate,
    editCode,
    deleteCode,
    voteCode,
    createJob,
    getJob
}

export {
    registerHandlersWS
}

export default codesController
