import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import CodeModel, { CODE_MINIMAL_FIELDS, CodeMinimal } from "../models/Code";
import UpvoteModel from "../models/Upvote";
import templates from "../data/templates";
import EvaluationJobModel from "../models/EvaluationJob";
import { escapeRegex } from "../utils/regexUtils";
import PostModel, { Post } from "../models/Post";
import PostTypeEnum from "../data/PostTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { Types } from "mongoose";
import { parseWithZod } from "../utils/zodUtils";
import { createCodeCommentSchema, createCodeSchema, createJobSchema, deleteCodeCommentSchema, deleteCodeSchema, editCodeCommentSchema, editCodeSchema, getCodeCommentsSchema, getCodeListSchema, getCodeSchema, getJobSchema, getTemplateSchema, voteCodeSchema } from "../validation/codesSchema";
import { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { formatUserMinimal } from "../helpers/userHelper";
import { deleteCodeAndCleanup, formatCodeMinimal } from "../helpers/codesHelper";
import { deletePostsAndCleanup, getAttachmentsByPostId, savePost } from "../helpers/postsHelper";
import { sendNotifications } from "../helpers/notificationHelper";
import { withTransaction } from "../utils/transaction";
import HttpError from "../exceptions/HttpError";
import { deleteComment, editComment, getCommmentsList } from "../helpers/commentsHelper";

const createCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createCodeSchema, req);
    const { name, language, source, cssSource, jsSource } = body;
    const currentUserId = req.userId;

    if (await CodeModel.countDocuments({ user: currentUserId }) >= 500) {
        throw new HttpError("You already have max count of codes", 403);
    }

    const code = await CodeModel.create({
        name,
        language,
        user: currentUserId,
        source,
        cssSource,
        jsSource
    });

    res.json({
        success: true,
        data: {
            code: {
                id: code._id,
                name: code.name,
                language: code.language,
                createdAt: code.createdAt,
                updatedAt: code.createdAt,
                userId: code.user,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource,
                isPublic: code.isPublic
            }
        }
    });
});

const getCodeList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCodeListSchema, req);
    const { page, count, filter, searchQuery, userId, language } = body;
    const currentUserId = req.userId;

    let dbQuery = CodeModel.find({
        hidden: false,
        $or: [
            { challenge: null },
            { challenge: { $exists: false } }
        ]
    });

    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = escapeRegex(searchQuery.trim());
        dbQuery = dbQuery.where({ name: new RegExp(`(^|\\b)${safeQuery}`, "i") });
    }

    if (language) {
        dbQuery = dbQuery.where({ language });
    }

    switch (filter) {
        case 1:
            dbQuery = dbQuery.where({ isPublic: true }).sort({ createdAt: "desc" });
            break;
        case 2:
            dbQuery = dbQuery.where({ isPublic: true }).sort({ votes: "desc" });
            break;
        case 3:
            if (!userId) {
                throw new HttpError("Invalid request", 400);
            }
            if (userId !== currentUserId) {
                dbQuery = dbQuery.where({ isPublic: true });
            }
            dbQuery = dbQuery.where({ user: userId }).sort({ updatedAt: "desc" });
            break;
        case 5:
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            dbQuery = dbQuery.where({ createdAt: { $gt: dayAgo }, isPublic: true }).sort({ votes: "desc" });
            break;
        default:
            throw new HttpError("Unknown filter", 400);
    }

    const [codeCount, result] = await Promise.all([
        dbQuery.clone().countDocuments(),
        dbQuery
            .clone()
            .skip((page - 1) * count)
            .limit(count)
            .select(CODE_MINIMAL_FIELDS)
            .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
            .lean<(CodeMinimal & { _id: Types.ObjectId } & { user: UserMinimal & { _id: Types.ObjectId } })[]>()
    ]);

    const data = result.map(x => formatCodeMinimal(x, x.user));

    if (currentUserId) {
        await Promise.all(data.map((item, i) =>
            UpvoteModel.findOne({ parentId: item.id, user: currentUserId }).lean().then(upvote => {
                data[i].isUpvoted = upvote !== null;
            })
        ));
    }

    res.json({ success: true, data: { count: codeCount, codes: data } });
});

const getCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCodeSchema, req);
    const { codeId } = body;
    const currentUserId = req.userId;

    const code = await CodeModel.findById(codeId)
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
        .lean();

    if (!code) {
        throw new HttpError("Code not found", 404);
    }

    const isUpvoted = currentUserId
        ? await UpvoteModel.exists({ parentId: codeId, user: currentUserId }).then(r => r !== null)
        : false;

    res.json({
        success: true,
        data: {
            code: {
                id: code._id,
                name: code.name,
                language: code.language,
                createdAt: code.createdAt,
                updatedAt: code.updatedAt,
                user: formatUserMinimal(code.user),
                comments: code.comments,
                votes: code.votes,
                isUpvoted,
                source: code.source,
                cssSource: code.cssSource,
                jsSource: code.jsSource,
                isPublic: code.isPublic
            }
        }
    });
});

const getTemplate = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { params } = parseWithZod(getTemplateSchema, req);

    const template = templates.find(x => x.language === params.language);
    if (template) {
        res.json({ success: true, data: { template } });
    } else {
        throw new HttpError("Template not found", 404);
    }
});

const editCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editCodeSchema, req);
    const { codeId, name, isPublic, source, cssSource, jsSource } = body;
    const currentUserId = req.userId;

    const code = await CodeModel.findById(codeId);
    if (!code) {
        throw new HttpError("Code not found", 404);
    }

    if (!code.user.equals(currentUserId)) {
        throw new HttpError("Unauthorized", 401);
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

    const code = await CodeModel.findById(codeId).lean();
    if (!code) {
        throw new HttpError("Code not found", 404);
    }

    if (!code.user.equals(currentUserId)) {
        throw new HttpError("Unauthorized", 401);
    }

    await withTransaction(async (session) => {
        await deleteCodeAndCleanup(code._id, session);
    });

    res.json({ success: true });
});

const voteCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(voteCodeSchema, req);
    const { codeId, vote } = body;
    const currentUserId = req.userId;

    const upvote = await withTransaction(async (session) => {
        const code = await CodeModel.findById(codeId).session(session);
        if (!code) throw new HttpError("Code not found", 404);

        let upvote = await UpvoteModel.findOne({ parentId: codeId, user: currentUserId }).session(session);

        if (vote === 1) {
            if (!upvote) {
                [upvote] = await UpvoteModel.create([{ user: currentUserId, parentId: codeId }], { session });
                code.$inc("votes", 1);
                await code.save({ session });
            }
        } else if (vote === 0) {
            if (upvote) {
                await UpvoteModel.deleteOne({ _id: upvote._id }, { session });
                upvote = null;
                code.$inc("votes", -1);
                await code.save({ session });
            }
        }

        return upvote;
    });

    res.json({ success: true, data: { vote: upvote ? 1 : 0 } });
});

const getCodeComments = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCodeCommentsSchema, req);
    const { codeId, parentId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    const data = await getCommmentsList({
        postFilter: { codeId, _type: PostTypeEnum.CODE_COMMENT },
        parentId,
        index,
        count,
        filter,
        findPostId,
        userId: currentUserId
    });

    res.json({ success: true, data: { posts: data } });
});

const createCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createCodeCommentSchema, req);
    const { codeId, message, parentId } = body;
    const currentUserId = req.userId;

    const reply = await withTransaction(async (session) => {
        const code = await CodeModel.findById(codeId).session(session);
        if (!code) throw new HttpError("Code not found", 404);

        let parentPost = null;
        if (parentId) {
            parentPost = await PostModel.findById(parentId).session(session);
            if (!parentPost) throw new HttpError("Parent post not found", 404);
        }

        const reply = new PostModel({
            _type: PostTypeEnum.CODE_COMMENT,
            message,
            codeId,
            parentId,
            user: currentUserId
        });
        await savePost(reply, session);

        if (parentPost && !parentPost.user.equals(currentUserId)) {
            await sendNotifications({
                title: "New reply",
                message: `{action_user} replied to your comment on code "${code.name}"`,
                type: NotificationTypeEnum.CODE_COMMENT,
                actionUser: new Types.ObjectId(currentUserId),
                codeId: code._id,
                postId: reply._id
            }, [parentPost.user]);
        }

        if (!code.user.equals(currentUserId) && (!parentPost || !code.user.equals(parentPost.user))) {
            await sendNotifications({
                title: "New comment",
                message: `{action_user} posted comment on your code "${code.name}"`,
                type: NotificationTypeEnum.CODE_COMMENT,
                actionUser: new Types.ObjectId(currentUserId),
                codeId: code._id,
                postId: reply._id
            }, [code.user]);
        }

        code.$inc("comments", 1);
        await code.save({ session });

        if (parentPost) {
            parentPost.$inc("answers", 1);
            await parentPost.save({ session });
        }

        return reply;
    });

    const attachments = await getAttachmentsByPostId({ post: reply._id });

    res.json({
        success: true,
        data: {
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                parentId: reply.parentId,
                votes: reply.votes,
                answers: reply.answers,
                attachments
            }
        }
    });
});

const editCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editCodeCommentSchema, req);
    const { id, message } = body;
    const currentUserId = req.userId;

    const data = await editComment(id, currentUserId!, message);

    res.json({
        success: true,
        data
    });
});

const deleteCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteCodeCommentSchema, req);
    const { id } = body;
    const currentUserId = req.userId;

    await deleteComment(id, currentUserId!);

    res.json({ success: true });
});

const createJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createJobSchema, req);
    const { language, source, stdin } = body;
    const deviceId = req.deviceId;

    const job = await EvaluationJobModel.create({
        language,
        source,
        stdin: [stdin || ""],
        deviceId
    });

    res.json({ success: true, data: { jobId: job._id } });
});

const getJob = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getJobSchema, req);
    const { jobId } = body;

    const job = await EvaluationJobModel.findById(jobId, { source: 0 }).lean();
    if (!job) {
        throw new HttpError("Job does not exist", 404);
    }

    let stdout = "";
    let stderr = "";

    if (job.result) {
        stderr += job.result.compileErr ?? "";
        if (job.result.runResults.length > 0) {
            stdout = job.result.runResults[0].stdout ?? "";
            stderr += job.result.runResults[0].stderr ?? "";
        }
    }

    res.json({
        success: true,
        data: {
            job: {
                id: job._id,
                deviceId: job.deviceId,
                status: job.status,
                language: job.language,
                stdin: job.stdin,
                stdout,
                stderr
            }
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
};

export default codesController;
