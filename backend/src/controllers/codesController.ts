import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Code from "../models/Code";
import Upvote from "../models/Upvote";
import templates from "../data/templates";
import EvaluationJob from "../models/EvaluationJob";
import { escapeRegex } from "../utils/regexUtils";
import Post from "../models/Post";
import PostAttachment from "../models/PostAttachment";
import Notification from "../models/Notification";
import PostTypeEnum from "../data/PostTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { Types } from "mongoose";
import { parseWithZod } from "../utils/zodUtils";
import { createCodeCommentSchema, createCodeSchema, createJobSchema, deleteCodeCommentSchema, deleteCodeSchema, editCodeCommentSchema, editCodeSchema, getCodeCommentsSchema, getCodeListSchema, getCodeSchema, getJobSchema, getTemplateSchema, voteCodeSchema } from "../validation/codesSchema";

const createCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createCodeSchema, req);
    const { name, language, source, cssSource, jsSource } = body;
    const currentUserId = req.userId;

    if (await Code.countDocuments({ user: currentUserId }) >= 500) {
        res.status(403).json({ error: [{ message: "You already have max count of codes" }] });
        return;
    }

    const code = await Code.create({
        name,
        language,
        user: currentUserId,
        source,
        cssSource,
        jsSource
    });

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
});

const getCodeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCodeListSchema, req);
    const { page, count, filter, searchQuery, userId, language } = body;
    const currentUserId = req.userId;

    let dbQuery = Code.find({ hidden: false });

    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = escapeRegex(searchQuery.trim());
        const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");
        dbQuery = dbQuery.where({
            $or: [
                { name: searchRegex }
            ]
        });
    }

    if (language) {
        dbQuery = dbQuery.where({ language });
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
                res.status(400).json({ error: [{ message: "Invalid request" }] });
                return;
            }
            if (userId !== currentUserId) {
                dbQuery = dbQuery.where({ isPublic: true });
            }
            dbQuery = dbQuery
                .where({ user: userId })
                .sort({ updatedAt: "desc" });
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
        default: {
            res.status(400).json({ error: [{ message: "Unknown filter" }] });
            return;
        }
    }

    const codeCount = await dbQuery.clone().countDocuments();

    const result = await dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .select("-source -cssSource -jsSource")
        .populate("user", "name avatarImage level roles") as any[];

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
});

const getCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCodeSchema, req);
    const { codeId } = body;
    const currentUserId = req.userId;

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
    } else {
        res.status(404).json({ error: [{ message: "Code not found" }] });
    }
});

const getTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { params } = parseWithZod(getTemplateSchema, req);

    const template = templates.find(x => x.language === params.language);
    if (template) {
        res.json({
            template
        });
    } else {
        res.status(404).json({ error: [{ message: "Template not found" }] });
    }
});

const editCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editCodeSchema, req);
    const { codeId, name, isPublic, source, cssSource, jsSource } = body;
    const currentUserId = req.userId;

    const code = await Code.findById(codeId);

    if (code === null) {
        res.status(404).json({ error: [{ message: "Code not found" }] });
        return;
    }

    if (currentUserId != code.user) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    code.name = name;
    code.isPublic = isPublic;
    code.source = source;
    code.cssSource = cssSource;
    code.jsSource = jsSource;

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
    });
});

const deleteCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteCodeSchema, req);
    const { codeId } = body;
    const currentUserId = req.userId;

    const code = await Code.findById(codeId);

    if (code === null) {
        res.status(404).json({ error: [{ message: "Code not found" }] });
        return;
    }

    if (currentUserId != code.user) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    await Code.deleteAndCleanup(codeId);

    res.json({ success: true });
});

const voteCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(voteCodeSchema, req);
    const { codeId, vote } = body;
    const currentUserId = req.userId;

    const code = await Code.findById(codeId);
    if (code === null) {
        res.status(404).json({ error: [{ message: "Code not found" }] });
        return;
    }

    let upvote = await Upvote.findOne({ parentId: codeId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = await Upvote.create({ user: currentUserId, parentId: codeId });
            code.$inc("votes", 1);
            await code.save();
        }
    } else if (vote === 0) {
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
    const { body } = parseWithZod(getCodeCommentsSchema, req);
    const { codeId, parentId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    let parentPost: any = null;
    if (parentId) {
        parentPost = await Post
            .findById(parentId)
            .populate("user", "name avatarImage countryCode level roles");
    }

    let dbQuery = Post.find({ codeId, _type: PostTypeEnum.CODE_COMMENT, hidden: false });

    let skipCount = index;

    if (findPostId) {
        const reply = await Post.findById(findPostId);

        if (reply === null) {
            res.status(404).json({ error: [{ message: "Post not found" }] });
            return;
        }

        parentPost = reply.parentId ? await Post
            .findById(reply.parentId)
            .populate("user", "name avatarImage countryCode level roles")
            : null;

        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });

        skipCount = Math.max(0, (await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()));

        dbQuery = dbQuery
            .sort({ createdAt: "asc" });
    } else {
        dbQuery = dbQuery.where({ parentId });

        switch (filter) {
            // Most popular
            case 1: {
                dbQuery = dbQuery
                    .sort({ votes: "desc", createdAt: "desc" });
                break;
            }
            // Oldest first
            case 2: {
                dbQuery = dbQuery
                    .sort({ createdAt: "asc" });
                break;
            }
            // Newest first
            case 3: {
                dbQuery = dbQuery
                    .sort({ createdAt: "desc" });
                break;
            }
            default: {
                res.status(400).json({ error: [{ message: "Unknown filter" }] });
                return;
            }
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles") as any[];

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
    }));

    let promises = [];

    for (let i = 0; i < data.length; ++i) {
        if (currentUserId) {
            promises.push(Upvote.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                data[i].isUpvoted = !(upvote === null);
            }));
        }
        promises.push(PostAttachment.getByPostId({ post: data[i].id }).then(attachments => data[i].attachments = attachments));
    }

    await Promise.all(promises);

    res.status(200).json({ posts: data });
});

const createCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createCodeCommentSchema, req);
    const { codeId, message, parentId } = body;
    const currentUserId = req.userId;

    const code = await Code.findById(codeId);
    if (code === null) {
        res.status(404).json({ error: [{ message: "Code not found" }] });
        return;
    }

    let parentPost = null;
    if (parentId !== null) {
        parentPost = await Post.findById(parentId);
        if (parentPost === null) {
            res.status(404).json({ error: [{ message: "Parent post not found" }] });
            return;
        }
    }

    const reply = await Post.create({
        _type: PostTypeEnum.CODE_COMMENT,
        message,
        codeId,
        parentId,
        user: currentUserId
    });

    if (parentPost != null && parentPost.user != currentUserId) {
        await Notification.sendToUsers([parentPost.user as Types.ObjectId], {
            title: "New reply",
            message: `{action_user} replied to your comment on "${code.name}"`,
            type: NotificationTypeEnum.CODE_COMMENT,
            actionUser: currentUserId!,
            codeId: code._id,
            postId: reply._id
        });
    }
    if (code.user != currentUserId && (parentPost == null || code.user.toString() != parentPost.user.toString())) {
        await Notification.sendToUsers([code.user as Types.ObjectId], {
            title: "New comment",
            message: `{action_user} posted comment on your code "${code.name}"`,
            type: NotificationTypeEnum.CODE_COMMENT,
            actionUser: currentUserId!,
            codeId: code._id,
            postId: reply._id
        });
    }

    code.$inc("comments", 1);
    await code.save();

    if (parentPost) {
        parentPost.$inc("answers", 1);
        await parentPost.save();
    }

    const attachments = await PostAttachment.getByPostId({ post: reply._id });

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
    });
});

const editCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editCodeCommentSchema, req);
    const { id, message } = body;
    const currentUserId = req.userId;

    const comment = await Post.findById(id);

    if (comment === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (currentUserId != comment.user) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    comment.message = message;

    await comment.save();

    const attachments = await PostAttachment.getByPostId({ post: comment._id });

    res.json({
        success: true,
        data: {
            id: comment._id,
            message: comment.message,
            attachments
        }
    });
});

const deleteCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteCodeCommentSchema, req);
    const { id } = body;
    const currentUserId = req.userId;

    const comment = await Post.findById(id);

    if (comment === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (currentUserId != comment.user) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const code = await Code.findById(comment.codeId);
    if (code === null) {
        res.status(404).json({ error: [{ message: "Code not found" }] });
        return;
    }

    await Post.deleteAndCleanup({ _id: id });

    res.json({ success: true });
});

const createJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createJobSchema, req);
    const { language, source, stdin } = body;
    const deviceId = req.deviceId;

    const job = await EvaluationJob.create({
        language,
        source,
        stdin: [stdin],
        deviceId
    });

    res.json({
        jobId: job._id
    });
});

const getJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getJobSchema, req);
    const { jobId } = body;

    const job = await EvaluationJob.findById(jobId).select("-source");
    if (!job) {
        res.status(404).json({ error: [{ message: "Job does not exist" }] });
        return;
    }

    let stdout = "";
    let stderr = "";

    if(job.result) {
        stderr += job.result.compileErr ?? "";

        if(job.result.runResults.length > 0) {
            stdout = job.result.runResults[0].stdout ?? "";
            stderr += job.result.runResults[0].stderr ?? "";
        }
    }

    res.json({
        job: {
            id: job._id,
            deviceId: job.deviceId,
            status: job.status,
            language: job.language,
            stdin: job.stdin,
            stdout,
            stderr
        }
    });
});

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

export default codesController
