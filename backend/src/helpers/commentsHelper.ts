import mongoose, { Types } from "mongoose";
import HttpError from "../exceptions/HttpError";
import PostModel, { Post } from "../models/Post";
import { withTransaction } from "../utils/transaction";
import { deletePostsAndCleanup, getAttachmentsByPostId, PostAttachmentDetails, savePost } from "./postsHelper";
import { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { formatUserMinimal } from "./userHelper";
import UpvoteModel from "../models/Upvote";
import { getBlockedUserIds, isBlocked } from "./userHelper";

type PopulatedPost = Post & { _id: Types.ObjectId; user: UserMinimal };

interface GetCommentsListParams {
    postFilter: mongoose.QueryFilter<Post>,
    index: number,
    count: number,
    filter: number,
    findPostId?: Types.ObjectId | string | null,
    parentId?: Types.ObjectId | string | null,
    userId?: Types.ObjectId | string | null
}

export const getCommmentsList = async (params: GetCommentsListParams) => {
    let parentPost: PopulatedPost | null = null;
    if (params.parentId) {
        parentPost = await PostModel.findById(params.parentId)
            .populate<{ user: UserMinimal }>("user", USER_MINIMAL_FIELDS)
            .lean<PopulatedPost>();
    }

    const blockedIds = params.userId ? await getBlockedUserIds(params.userId) : [];

    let dbQuery = PostModel.find({ ...params.postFilter, hidden: false, user: { $nin: blockedIds } });
    let skipCount = params.index;

    if (params.findPostId) {
        const reply = await PostModel.findById(params.findPostId).lean();
        if (!reply) {
            throw new HttpError("Post not found", 404);
        }

        parentPost = reply.parentId
            ? await PostModel.findById(reply.parentId)
                .populate<{ user: UserMinimal }>("user", USER_MINIMAL_FIELDS)
                .lean<PopulatedPost>()
            : null;

        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });
        skipCount = Math.max(0, await dbQuery.clone().where({ createdAt: { $lt: reply.createdAt } }).countDocuments());
        dbQuery = dbQuery.sort({ createdAt: "asc" });
    } else {
        dbQuery = dbQuery.where({ parentId: params.parentId });
        switch (params.filter) {
            case 1: dbQuery = dbQuery.sort({ votes: "desc", createdAt: "desc" }); break;
            case 2: dbQuery = dbQuery.sort({ createdAt: "asc" }); break;
            case 3: dbQuery = dbQuery.sort({ createdAt: "desc" }); break;
            default:
                throw new HttpError("Unknown filter", 400);
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(params.count)
        .populate<{ user: UserMinimal }>("user", USER_MINIMAL_FIELDS)
        .lean<PopulatedPost[]>();

    const data = (params.findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
        id: x._id,
        parentId: x.parentId,
        message: x.message,
        date: x.createdAt,
        user: formatUserMinimal(x.user),
        votes: x.votes,
        isUpvoted: false,
        answers: x.answers,
        index: params.findPostId && parentPost ? (offset === 0 ? -1 : skipCount + offset - 1) : skipCount + offset,
        attachments: [] as PostAttachmentDetails[]
    }));

    await Promise.all(data.map((item, i) => Promise.all([
        params.userId
            ? UpvoteModel.findOne({ parentId: item.id, user: params.userId }).lean().then(upvote => { data[i].isUpvoted = upvote !== null; })
            : Promise.resolve(),
        getAttachmentsByPostId({ post: item.id }).then(attachments => { data[i].attachments = attachments; })
    ])));

    return data;
}

export const editComment = async (id: Types.ObjectId | string, userId: Types.ObjectId | string, message: string) => {
    const comment = await PostModel.findById(id);
    if (!comment) {
        throw new HttpError("Post not found", 404);
    }

    if (!comment.user.equals(userId)) {
        throw new HttpError("Forbidden", 403);
    }

    comment.message = message;
    await withTransaction(async (session) => {
        await savePost(comment, session);
    });

    const attachments = await getAttachmentsByPostId({ post: comment._id });

    return { id: comment._id, message: comment.message, attachments };
}

export const deleteComment = async (id: Types.ObjectId | string, userId: Types.ObjectId | string) => {
    const comment = await PostModel.findById(id).lean();
    if (!comment) {
        throw new HttpError("Post not found", 404);
    }

    if (!comment.user.equals(userId)) {
        throw new HttpError("Forbidden", 403);
    }

    await withTransaction(async (session) => {
        await deletePostsAndCleanup({ _id: comment._id }, session);
    });
}

export const findParentCommentToReply = async (id: Types.ObjectId | string, userId: Types.ObjectId | string, session?: mongoose.ClientSession) => {
    const parentComment = await PostModel.findById(id, { message: 0 }).session(session ?? null);
    if (!parentComment) {
        throw new HttpError("Parent comment not found", 404);
    }
    if (await isBlocked(userId, parentComment.user)) {
        throw new HttpError("You cannot reply this comment", 403);
    }
    return parentComment;
}