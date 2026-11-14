import { Types } from "mongoose";
import { Post } from "../models/Post";
import { formatUserMinimal } from "./userHelper";
import { User } from "../models/User";
import UpvoteModel, { Upvote } from "../models/Upvote";
import { escapeMarkdown } from "../utils/regexUtils";
import { truncate } from "../shared/utils/StringUtils";
import ReactionsEnum from "../shared/data/ReactionsEnum";
import { getAttachmentsByPostId, PostAttachmentDetails } from "./postsHelper";
import PostModel from "../models/Post";
import PostTypeEnum from "../shared/data/PostTypeEnum";
import { USER_MINIMAL_FIELDS } from "../models/User";
import { getBlockedUserIds } from "./userHelper";
import mongoose from "mongoose";

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

/** Populates a feed query with the authors and the shared original posts */
export const populateFeedQuery = <T>(query: mongoose.Query<T, any>) => query
    .populate("user", USER_MINIMAL_FIELDS)
    .populate({
        path: "parentId",
        populate: { path: "user", select: USER_MINIMAL_FIELDS }
    });

/** Formats feeds with their reactions, attachments and the viewer's reaction */
export const formatFeedDetailsList = (feeds: FeedDetails[], currentUserId?: string) =>
    Promise.all(feeds.map(async x => {
        const [reactions, attachments, upvote] = await Promise.all([
            getReactionsForPost(x._id),
            getAttachmentsByPostId({ post: x._id }),
            currentUserId ? UpvoteModel.findOne({ parentId: x._id, user: currentUserId }).lean() : null
        ]);
        return formatFeedDetails(x, upvote, attachments, reactions);
    }));

/** A user's latest (non-pinned) feed posts, empty when the viewer and the user are blocked */
export const getUserFeeds = async (userId: Types.ObjectId | string, currentUserId: string | undefined, count: number) => {
    if (currentUserId) {
        const blockedIds = await getBlockedUserIds(currentUserId);
        if (blockedIds.some(id => String(id) === String(userId))) return [];
    }

    const feeds = await populateFeedQuery(
        PostModel.find({
            user: userId,
            _type: { $in: [PostTypeEnum.FEED, PostTypeEnum.SHARED_FEED] },
            hidden: false,
            isPinned: false
        })
            .sort({ createdAt: "desc" })
            .limit(count)
    ).lean<FeedDetails[]>();

    return formatFeedDetailsList(feeds, currentUserId);
}
