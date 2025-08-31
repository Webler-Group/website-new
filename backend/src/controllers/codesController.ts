import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Code from "../models/Code";
import Upvote from "../models/Upvote";
import templates from "../data/templates";
import EvaluationJob from "../models/EvaluationJob";
import { devRoom, getIO } from "../config/socketServer";
import { Socket } from "socket.io";
import { escapeRegex } from "../utils/regexUtils";
import Post, { PostType } from "../models/Post";
import PostAttachment from "../models/PostAttachment";
import { sendToUsers } from "../services/pushService";
import User from "../models/User";
import Notification from "../models/Notification";

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

    if (typeof page !== "number" || page < 1 || typeof count !== "number" || count < 1 || count > 100 || typeof filter === "undefined" || typeof searchQuery === "undefined" || typeof userId === "undefined" || typeof language === "undefined") {
        res.status(400).json({ message: "Invalid body" });
        return
    }

    const safeQuery = escapeRegex(searchQuery.trim());
    const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");

    let dbQuery = Code.find({ hidden: false })

    if (searchQuery.trim().length > 0) {
        dbQuery.where({
            $or: [
                { name: searchRegex }
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
                jsSource: code.jsSource,
                updatedAt: code.updatedAt
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

const getCodeComments = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { codeId, parentId, index, count, filter, findPostId } = req.body;

    if (typeof filter === "undefined" || typeof index !== "number" || index < 0 || typeof count !== "number" || count < 1 || count > 100) {
        res.status(400).json({ message: "Some fileds are missing" });
        return
    }

    let parentPost: any = null;
    if (parentId) {
        parentPost = await Post
            .findById(parentId)
            .populate("user", "name avatarImage countryCode level roles");
    }

    let dbQuery = Post.find({ codeId, _type: PostType.CODE_COMMENT, hidden: false });

    let skipCount = index;

    if (findPostId) {

        const reply = await Post.findById(findPostId);

        if (reply === null) {
            res.status(404).json({ message: "Post not found" })
            return
        }

        parentPost = reply.parentId ? await Post
            .findById(reply.parentId)
            .populate("user", "name avatarImage countryCode level roles")
            :
            null;

        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null })

        skipCount = Math.max(0, (await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()));

        dbQuery = dbQuery
            .sort({ createdAt: "asc" })
    }
    else {
        dbQuery = dbQuery.where({ parentId });

        switch (filter) {
            // Most popular
            case 1: {
                dbQuery = dbQuery
                    .sort({ votes: "desc", createdAt: "desc" })
                break;
            }
            // Oldest first
            case 2: {
                dbQuery = dbQuery
                    .sort({ createdAt: "asc" })
                break;
            }
            // Newest first
            case 3: {
                dbQuery = dbQuery
                    .sort({ createdAt: "desc" })
                break;
            }
            default:
                throw new Error("Unknown filter");
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles") as any[];

    if (result) {
        const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
            id: x._id,
            parentId: x.parentId,
            message: x.message,
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            level: x.user.level,
            roles: x.user.roles,
            votes: x.votes,
            isUpvoted: false,
            answers: x.answers,
            index: (findPostId && parentPost) ?
                offset === 0 ? -1 : skipCount + offset - 1 :
                skipCount + offset,
            attachments: new Array()
        }))

        let promises = [];

        for (let i = 0; i < data.length; ++i) {
            /*promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].votes = count;
            }));*/
            if (currentUserId) {
                promises.push(Upvote.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                    data[i].isUpvoted = !(upvote === null);
                }));
            }
            promises.push(PostAttachment.getByPostId({ post: data[i].id }).then(attachments => data[i].attachments = attachments));
        }

        await Promise.all(promises);

        res.status(200).json({ posts: data })
    }
    else {
        res.status(500).json({ message: "Error" });
    }
});

const createCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { codeId, message, parentId } = req.body;

    const code = await Code.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return
    }

    let parentPost = null;
    if (parentId !== null) {
        parentPost = await Post.findById(parentId);
        if (parentPost === null) {
            res.status(404).json({ message: "Parent post not found" });
            return
        }
    }

    const reply = await Post.create({
        _type: PostType.CODE_COMMENT,
        message,
        codeId,
        parentId,
        user: currentUserId
    })

    if (reply) {

        const usersToNotify = new Set<string>();
        usersToNotify.add(code.user.toString())
        if (parentPost !== null) {
            usersToNotify.add(parentPost.user.toString())
        }
        usersToNotify.delete(currentUserId!);

        const currentUserName = (await User.findById(currentUserId, "name"))!.name;

        await sendToUsers(Array.from(usersToNotify).filter(x => x !== code.user.toString()), {
            title: "New reply",
            body: `${currentUserName} replied to your comment on "${code.name}"`
        }, "codes");
        await sendToUsers([code.user.toString()], {
            title: "New comment",
            body: `${currentUserName} posted comment on your code "${code.name}"`
        }, "codes");

        for (let userToNotify of usersToNotify) {

            await Notification.create({
                _type: 202,
                user: userToNotify,
                actionUser: currentUserId,
                message: userToNotify === code.user.toString() ?
                    `{action_user} posted comment on your code "${code.name}"`
                    :
                    `{action_user} replied to your comment on "${code.name}"`,
                codeId: code._id,
                postId: reply._id
            })
        }

        code.$inc("comments", 1)
        await code.save();

        if (parentPost) {
            parentPost.$inc("answers", 1)
            await parentPost.save();
        }

        const attachments = await PostAttachment.getByPostId({ post: reply._id })

        res.json({
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                userId: reply.user,
                parentId: reply.parentId,
                votes: reply.votes,
                answers: reply.answers,
                attachments
            }
        })
    }
    else {
        res.status(500).json({ message: "error" });
    }
});

const editCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { id, message } = req.body;

    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" })
        return
    }

    const comment = await Post.findById(id);

    if (comment === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    comment.message = message;

    try {
        await comment.save();

        const attachments = await PostAttachment.getByPostId({ post: comment._id })

        res.json({
            success: true,
            data: {
                id: comment._id,
                message: comment.message,
                attachments
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

const deleteCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { id } = req.body;

    const comment = await Post.findById(id);

    if (comment === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    const code = await Code.findById(comment.codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" })
        return
    }

    try {

        await Post.deleteAndCleanup({ _id: id });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

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
    getJob,
    getCodeComments,
    createCodeComment,
    editCodeComment,
    deleteCodeComment
}

export {
    registerHandlersWS
}

export default codesController
