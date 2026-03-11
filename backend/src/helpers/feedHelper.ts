import { Types } from "mongoose";
import { Post } from "../models/Post";
import { formatUserMinimal } from "./userHelper";
import { User } from "../models/User";
import UpvoteModel, { Upvote } from "../models/Upvote";
import { escapeMarkdown } from "../utils/regexUtils";
import { truncate } from "../utils/StringUtils";
import ReactionsEnum from "../data/ReactionsEnum";
import { PostAttachmentDetails } from "./postsHelper";

export type FeedDetails = Post & { _id: Types.ObjectId, user: User & { _id: Types.ObjectId }, parentId: Post & { user: User & { _id: Types.ObjectId } } };

export interface PostReactions {
    totalReactions: number;
    topReactions: { reaction: ReactionsEnum, count: number }[];
}

export const getReactionsForPost = async (postId: Types.ObjectId) => {
    const reactionsAgg = await UpvoteModel.aggregate<{ _id: ReactionsEnum; count: number }>([
        { $match: { parentId: postId } },
        { $group: { _id: "$reaction", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
    return {
        totalReactions: reactionsAgg.reduce((sum, r) => sum + r.count, 0),
        topReactions: reactionsAgg.slice(0, 3).map(r => ({ reaction: r._id, count: r.count }))
    };
};

export const formatFeedDetails = (feed: FeedDetails, upvote: Upvote | null, attachments: PostAttachmentDetails[], reactions: PostReactions) => {
    return {
        id: feed._id,
        type: feed._type,
        message: feed.message,
        date: feed.createdAt,
        user: formatUserMinimal(feed.user),
        answers: feed.answers,
        votes: feed.votes,
        shares: feed.shares,
        reaction: upvote?.reaction ?? null,
        score: feed.votes + feed.shares + feed.answers,
        isPinned: feed.isPinned,
        attachments,
        originalPost: feed.parentId ? {
            id: feed.parentId._id,
            message: truncate(escapeMarkdown(feed.parentId.message), 40),
            user: formatUserMinimal(feed.parentId.user),
            date: feed.parentId.createdAt
        } : null,
        reactions
    }
}