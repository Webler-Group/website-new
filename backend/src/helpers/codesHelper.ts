import mongoose, { Types } from "mongoose";
import UpvoteModel from "../models/Upvote";
import CodeModel, { CODE_MINIMAL_FIELDS, CodeMinimal } from "../models/Code";
import { deletePostsAndCleanup } from "./postsHelper";
import { UserMinimal } from "../models/User";
import { formatUserMinimal } from "./userHelper";

export const formatCodeMinimal = (code: CodeMinimal & { _id: Types.ObjectId }, user?: UserMinimal) => {
    return {
        id: code._id,
        name: code.name,
        createdAt: code.createdAt,
        updatedAt: code.updatedAt,
        user: user ? formatUserMinimal(user) : code.user,
        comments: code.comments,
        votes: code.votes,
        isUpvoted: false,
        isPublic: code.isPublic,
        language: code.language
    };
}

export const deleteCodeAndCleanup = async (codeId: Types.ObjectId, session?: mongoose.ClientSession) => {
    await deletePostsAndCleanup({ codeId, parentId: null }, session);
    await UpvoteModel.deleteMany({ parentId: codeId }, { session });
    await CodeModel.deleteOne({ _id: codeId }, { session });
}

/** A user's latest playground codes (challenge solutions excluded); private ones only for the owner */
export const getUserCodes = async (userId: Types.ObjectId | string, currentUserId: string | undefined, count: number) => {
    const codes = await CodeModel.find({
        user: userId,
        hidden: false,
        $or: [{ challenge: null }, { challenge: { $exists: false } }],
        ...(String(userId) !== currentUserId && { isPublic: true })
    })
        .sort({ updatedAt: "desc" })
        .limit(count)
        .select(CODE_MINIMAL_FIELDS)
        .lean<(CodeMinimal & { _id: Types.ObjectId })[]>();

    return codes.map(x => formatCodeMinimal(x));
}
