import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Post from "../models/Post";
import Tag from "../models/Tag";
import Upvote from "../models/Upvote";
import Code from "../models/Code";
import PostFollowing from "../models/PostFollowing";
import Notification from "../models/Notification";
import mongoose, { PipelineStage } from "mongoose";
import PostAttachment from "../models/PostAttachment";
import { escapeRegex } from "../utils/regexUtils";
import { sendToUsers } from "../services/pushService";
import User from "../models/User";
import PostSharing from "../models/PostShare";
import PostReplies from "../models/PostReplies";


const createFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { message } = req.body;
    let { title } = req.body;
    let { tags } = req.body;
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';

    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const tagIds: any[] = [];

    if(!title) title = "Title not provided.";

    if(!tags) tags = [];

    for (let tagName of tags) {
        const tag = await Tag.findOne({ name: tagName });
        if (!tag) {
            res.status(400).json({ message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }

    // if (tagIds.length < 1) {
    //     res.status(400).json({ message: `Empty Tag` });
    //     return;
    // }

    // tag names
    const tagNames: string[] = [];
    for (let tagId of tagIds) {
        const tag = await Tag.findById(tagId);
        if (tag) {
            tagNames.push(tag.name);
        }
    }

    const feed = await Post.create({
        _type: 4,
        title,
        message,
        tags: tagIds,
        user: currentUserId,
        isAccepted: true
    })

    if (feed) {

        await PostFollowing.create({
            user: currentUserId,
            following: feed._id
        });

        res.json({
            feed: {
                type: 4,
                id: feed._id,
                title: feed.title,
                message: feed.message,
                tags: tagNames,
                date: feed.createdAt,
                userId: feed.user,
                isAccepted: feed.isAccepted,
                votes: feed.votes,
                answers: feed.answers
            }
        });
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});

const editFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';


    const { feedId, message } = req.body;
    let  { title, tags } = req.body;

    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const feed = await Post.findById(feedId);

    if(!title) title = "Title not provided."
    if(!tags) tags = [];

    if (feed === null) {
        res.status(404).json({ message: "Feed not found" })
        return
    }

    if (feed.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" })
        return
    }

    const tagIds: any[] = [];
    let promises: Promise<void>[] = [];

    for (let tagName of tags) {
  promises.push(
    Tag.findOne({ name: tagName })
      .then(tag => {
        if (tag) tagIds.push(tag._id);
      })
  );
}

    await Promise.all(promises);

    feed.title = title;
    feed.message = message;
    feed.tags = tagIds;

    try {
        await feed.save();

        res.json({
            success: true,
            data: {
                id: feed._id,
                title: feed.title,
                message: feed.message,
                tags: feed.tags
            }
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }

});

const deleteFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';

    const { feedId } = req.body;

    const feed = await Post.findById(feedId);

    if (feed === null) {
        res.status(404).json({ message: "Feed not found" })
        return
    }

    if (feed.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" })
        return
    }

    try {
        await Post.deleteAndCleanup({ _id: feedId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    // const currentUserId = "68a7400f3dd5eef60a166911";
    const { message, feedId } = req.body;

    const feed = await Post.findById(feedId);
    if (feed === null) {
        res.status(404).json({ message: "Feed not found" });
        return
    }

    const reply = await Post.create({
        _type: 2,
        message,
        parentId: feedId,
        user: currentUserId
    })

    if (reply) {

        const feedFollowed = await PostFollowing.findOne({
            user: currentUserId,
            following: feed._id
        })

        if (feedFollowed === null) {
            await PostFollowing.create({
                user: currentUserId,
                following: feed._id
            });
        }

        const followers = new Set(((await PostFollowing.find({ following: feed._id })) as any[]).map(x => x.user.toString()));
        followers.add(feed.user.toString())
        followers.delete(currentUserId)

        const currentUserName = (await User.findById(currentUserId, "name"))!.name;

        await sendToUsers(Array.from(followers).filter(x => x !== feed.user.toString()), {
            title: "New answer",
            body: `${currentUserName} posted in "${feed.title}"`
        }, "feed");

        await sendToUsers([feed.user.toString()], {
            title: "New answer",
            body: `${currentUserName} answered your feed "${feed.title}"`
        }, "feed");

        for (let userToNotify of followers) {

            await Notification.create({
                _type: 201,
                user: userToNotify,
                actionUser: currentUserId,
                message: userToNotify === feed.user.toString() ?
                    `{action_user} answered your feed "${feed.title}"`
                    :
                    `{action_user} posted in "${feed.title}"`,
                feedId: feed._id,
                postId: reply._id
            })
        }

        feed.$inc("answers", 1)
        await feed.save();

        const attachments = await PostAttachment.getByPostId({ post: reply._id })

        res.json({
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                userId: reply.user,
                parentId: reply.parentId,
                isAccepted: reply.isAccepted,
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

const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    // const currentUserId = "68a7400f3dd5eef60a166911";
    const { replyId, message } = req.body;

    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" })
        return
    }

    const reply = await Post.findById(replyId);

    if (reply === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != reply.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    reply.message = message;

    try {
        await reply.save();

        const attachments = await PostAttachment.getByPostId({ post: reply._id })

        res.json({
            success: true,
            data: {
                id: reply._id,
                message: reply.message,
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

const deleteReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    // const currentUserId = "68a7400f3dd5eef60a166911";

    const { replyId } = req.body;

    const reply = await Post.findById(replyId);

    if (reply === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != reply.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    const feed = await Post.findById(reply.parentId);
    if (feed === null) {
        res.status(404).json({ message: "Feed not found" })
        return
    }

    try {
        await Post.deleteAndCleanup({ _id: replyId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

const toggleAcceptedAnswer = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { accepted, postId } = req.body;

    const post = await Post.findById(postId);

    if (post === null) {
        res.status(404).json({ success: false, message: "Post not found" })
        return
    }

    const feed = await Post.findById(post.parentId);
    if (feed === null) {
        res.status(404).json({ message: "Feed not found" })
        return
    }

    if (accepted || post.isAccepted) {
        feed.isAccepted = accepted;
        await feed.save();
    }

    post.isAccepted = accepted;

    await post.save();

    if (accepted) {
        const currentAcceptedPost = await Post.findOne({ parentId: post.parentId, isAccepted: true, _id: { $ne: postId } });
        if (currentAcceptedPost) {
            currentAcceptedPost.isAccepted = false;

            await currentAcceptedPost.save();
        }
    }

    res.json({
        success: true,
        accepted
    });

});

const votePost = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    // const currentUserId = "68a7400f3dd5eef60a166911";
    const { postId, vote } = req.body;
    console.log(vote, postId)
    if (typeof vote === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const post = await Post.findById(postId);
    if (post === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    let upvote = await Upvote.findOne({ parentId: postId, user: currentUserId });
    if (vote === true) {
        console.log("Ooga")
        if (!upvote) {
            upvote = await Upvote.create({ user: currentUserId, parentId: postId })
            post.$inc("votes", 1)
            await post.save();
        }
    }
    else if (vote === false) {
        if (upvote) {
            await Upvote.deleteOne({ _id: upvote._id });
            upvote = null;
            post.$inc("votes", -1)
            await post.save();
        }
    }

    res.json({ vote: upvote ? 1 : 0, votes: post.votes });

})

const followFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { postId } = req.body;

    if (typeof postId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const postExists = await Post.findOne({ _id: postId })
    if (!postExists) {
        res.status(404).json({ message: "Post not found" });
        return
    }

    if (postExists._type !== 1) {
        res.status(405).json({ message: "Post is not a feed" });
        return
    }

    const exists = await PostFollowing.findOne({ user: currentUserId, following: postId });
    if (exists) {
        res.status(204).json({ success: true })
        return
    }

    const postFollowing = await PostFollowing.create({
        user: currentUserId,
        following: postId
    });

    if (postFollowing) {

        res.json({ success: true })
        return
    }

    res.status(500).json({ success: false });
});

const unfollowFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { postId } = req.body;

    if (typeof postId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const postExists = await Post.findOne({ _id: postId })
    if (!postExists) {
        res.status(404).json({ message: "Post not found" });
        return
    }

    if (postExists._type !== 1) {
        res.status(405).json({ message: "Post is not a feed" });
        return
    }

    const postFollowing = await PostFollowing.findOne({ user: currentUserId, following: postId });
    if (postFollowing === null) {
        res.status(204).json({ success: true })
        return
    }

    const result = await PostFollowing.deleteOne({ user: currentUserId, following: postId })
    if (result.deletedCount == 1) {

        res.json({ success: true })
        return
    }

    res.status(500).json({ success: false });
});

const shareFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { feedId, message } = req.body;
    let { title } = req.body;
    let { tags } = req.body;
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';

    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if(!title) title = "Title not provided."

    const tagIds: any[] = [];

    if(!tags) tags = []

    for (let tagName of tags) {
        console.log(tagName)
        const tag = await Tag.findOne({ name: tagName });
        if (!tag) {
            res.status(400).json({ message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }

    // if (tagIds.length < 1) {
    //     res.status(400).json({ message: `Empty Tag` });
    //     return;
    // }


    const tagNames: string[] = [];
    for (let tagId of tagIds) {
        const tag = await Tag.findById(tagId);
        if (tag) {
            tagNames.push(tag.name);
        }
    }


    const feed = await Post.create({
        _type: 5,
        title,
        message,
        tags: tagIds,
        user: currentUserId,
        isAccepted: true,
        parentId: feedId
    })

    if (feed) {

        await PostFollowing.create({
            user: currentUserId,
            following: feed._id
        });

        const post_sharing = await PostSharing.create({
            user: currentUserId,
            originalPost: feedId,
            sharedPost: feed._id
        })

        const post = await Post.findById(feedId);

        if(post_sharing && post) {
            post.$inc("shares", 1)
            await post.save();
        }


        res.json({
            feed: {
                id: feed._id,
                title: feed.title,
                message: feed.message,
                tags: tagNames,
                date: feed.createdAt,
                userId: feed.user,
                isAccepted: feed.isAccepted,
                votes: feed.votes,
                answers: feed.answers,
                parentId: feedId
            }
        });
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});


const getFeedList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { page, count, filter, searchQuery } = req.body;
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';

    if (typeof page === "undefined" || typeof count === "undefined" || typeof filter === "undefined" || typeof searchQuery === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }

    const safeQuery = escapeRegex(searchQuery.trim());
    const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");

    let pipeline: PipelineStage[] = [
        { $match: { _type: { $in: [4, 5] }, hidden: false } },
        {
            $set: {
                score: { $add: ["$votes", "$shares", "$answers"] }
            }
        }
    ];

    if (searchQuery.trim().length > 0) {
        const tagIds = (await Tag.find({ name: searchQuery.trim() }))
            .map(x => x._id);
        pipeline.push({
            $match: {
                $or: [
                    { message: searchRegex },
                    { title: searchRegex },
                    { "tags": { $in: tagIds } }
                ]
            }
        });
    }

    switch (filter) {
        // Most Recent
        case 1: {
            pipeline.push({
                $sort: { createdAt: -1 }
            });
            break;
        }
        // My Feed Posts
        case 2: {
            if (!currentUserId) {
                res.status(400).json({ message: "Invalid request - userId required" });
                return;
            }
            pipeline.push({
                $match: { user: new mongoose.Types.ObjectId(currentUserId) }
            }, {
                $sort: { createdAt: -1 }
            });
            break;
        }
        // Following Feed (posts from users I follow)
        case 3: {
            if (!currentUserId) {
                res.status(400).json({ message: "Authentication required" });
                return;
            }
            const followingUsers = await PostFollowing.find({ 
                user: currentUserId 
            }).select("following");
            const followingUserIds = followingUsers.map(f => f.following);
            
            pipeline.push({
                $match: { user: { $in: followingUserIds } }
            }, {
                $sort: { createdAt: -1 }
            });
            break;
        }
        // Hot Today (trending in last 24 hours)
        case 4: {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            pipeline.push({
                $match: { createdAt: { $gt: dayAgo } }
            }, {
                $sort: { score: -1 }
            });
            break;
        }
        // Most Popular (by score)
        case 5: {
            pipeline.push({
                $sort: { score: -1 }
            });
            break;
        }
        // Most Shared
        case 6: {
            pipeline.push({
                $sort: { shares: -1 }
            });
            break;
        }
        default:
            res.status(400).json({ message: "Unknown filter" });
            return;
    }

    const countPipeline = [...pipeline];
    countPipeline.push({ $count: "total" });
    const countResult = await Post.aggregate(countPipeline);
    const feedCount = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push(
        { $skip: (page - 1) * count },
        { $limit: count },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "users"
            }
        },
        {
            $lookup: {
                from: "tags",
                localField: "tags",
                foreignField: "_id",
                as: "tags"
            }
        },
        {
            $lookup: {
                from: "posts",
                localField: "parentId",
                foreignField: "_id",
                as: "originalPost",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "users"
                        }
                    },
                    {
                        $lookup: {
                            from: "tags",
                            localField: "tags",
                            foreignField: "_id",
                            as: "tags"
                        }
                    },
                    { $limit: 1 }
                ]
            }
        }
    );

    const result = await Post.aggregate(pipeline);

    if (result) {
        const data = result.map(x => ({
            id: x._id,
            type: x._type,
            title: x.title || null,
            message: x.message,
            tags: x.tags.map((y: any) => y.name),
            date: x.createdAt,
            userId: x.user,
            userName: x.users.length ? x.users[0].name : "Unknown User",
            userAvatarImage: x.users.length ? x.users[0].avatarImage || null : null,
            answers: x.answers || 0,
            votes: x.votes || 0,
            shares: x.shares || 0,
            level: x.users[0].level,
            roles: x.users[0].roles,
            isUpvoted: false,
            isShared: false,
            isFollowing: false,
            score: x.score || 0,
            isPinned: x.isPinned,
            originalPost: x.originalPost.length ? {
                id: x.originalPost[0]._id,
                title: x.originalPost[0].title || null,
                message: x.originalPost[0].message,
                tags: x.originalPost[0].tags.map((t: any) => t.name),
                userId: x.originalPost[0].user,
                userName: x.originalPost[0].users.length ? x.originalPost[0].users[0].name : "Unknown User",
                userAvatarImage: x.originalPost[0].users.length ? x.originalPost[0].users[0].avatarImage || null : null,
                date: x.originalPost[0].createdAt
            } : null
        }));

        // Check user interactions
        const promises = [];
        for (let i = 0; i < data.length; i++) {
            if (currentUserId) {
                // Check if upvoted
                promises.push(
                    Upvote.findOne({ parentId: data[i].id, user: currentUserId })
                        .then(upvote => {
                            data[i].isUpvoted = !(upvote === null);
                        })
                );

                // Check if following this post
                promises.push(
                    PostFollowing.findOne({ following: data[i].id, user: currentUserId })
                        .then(following => {
                            data[i].isFollowing = !(following === null);
                        })
                );
            }
        }

        await Promise.all(promises);

        res.status(200).json({
            count: feedCount,
            feeds: data,
            currentPage: page,
            totalPages: Math.ceil(feedCount / count)
        });
    } else {
        res.status(500).json({ message: "Error fetching feed" });
    }
});

const getFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { feedId } = req.body;
    const currentUserId = req.userId;

    if (!feedId) {
        res.status(400).json({ message: "Feed ID is required" });
        return;
    }

    console.log(feedId)

    const pipeline: PipelineStage[] = [
        { $match: { _id: new mongoose.Types.ObjectId(feedId), _type: { $in: [4, 5] }, hidden: false } },
        { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "users" } },
        { $lookup: { from: "tags", localField: "tags", foreignField: "_id", as: "tags" } },
        { $lookup: { from: "postattachments", localField: "_id", foreignField: "postId", as: "attachments" } }
    ];

    // If it's a shared post (_type: 5), get original post details
    if (await Post.findOne({ _id: feedId, _type: 5 })) {
        pipeline.push({
            $lookup: {
                from: "posts",
                localField: "parentId",
                foreignField: "_id",
                as: "originalPost",
                pipeline: [
                    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "originalUser" } }
                ]
            }
        });
    }

    const result = await Post.aggregate(pipeline);

    if (result.length === 0) {
        res.status(404).json({ message: "Feed not found" });
        return;
    }

    const feed = result[0];
    const data: any = {
        id: feed._id,
        type: feed._type,
        title: feed.title || null,
        message: feed.message,
        tags: feed.tags.map((tag: any) => ({ id: tag._id, name: tag.name })),
        date: feed.createdAt,
        updatedAt: feed.updatedAt,
        userId: feed.user,
        userName: feed.users.length ? feed.users[0].name : "Unknown User",
        userAvatarImage: feed.users.length ? feed.users[0].avatarImage : null,
        level: feed.users.length ? feed.users[0].level : 0,
        roles: feed.users.length ? feed.users[0].roles : [],
        answers: feed.answers || 0,
        votes: feed.votes || 0,
        shares: feed.shares || 0,
        attachments: feed.attachments || [],
        isUpvoted: false,
        isFollowing: false,
        originalPost: null
    };

    // Handle shared post data
    if (feed._type === 5 && feed.originalPost && feed.originalPost.length > 0) {
        const original = feed.originalPost[0];
        data.originalPost = {
            id: original._id,
            message: original.message,
            title: original.title,
            date: original.createdAt,
            userName: original.originalUser.length ? original.originalUser[0].name : "Unknown User",
            userAvatarImage: original.originalUser.length ? original.originalUser[0].avatarImage : null,
            tags: original.tags
        };
    }

    // Check user interactions if authenticated
    if (currentUserId) {
        const [upvote, following] = await Promise.all([
            Upvote.findOne({ parentId: feedId, user: currentUserId }),
            PostFollowing.findOne({ following: feedId, user: currentUserId })
        ]);

        data.isUpvoted = !(upvote === null);
        data.isFollowing = !(following === null);
    }

    res.status(200).json({ feed: data });
});

/**
 * Response shapes used internally — adjust if you have a shared type file
 */
interface NestedReply {
  id: string;
  message: string;
  date: Date;
  userId: string;
  userName: string;
  userAvatar: string | null;
  level: number;
  roles: string[];
  isUpvoted: boolean;
  votes: number;
}

interface Reply {
  id: string;
  message: string;
  date: Date;
  userId: string;
  userName: string;
  userAvatar: string | null;
  level: number;
  roles: string[];
  votes: number;
  answers: number;
  isUpvoted: boolean;
  replies: NestedReply[];
}

export const getReplies = asyncHandler(
  async (req: IAuthRequest, res: Response): Promise<void> => {
    const { feedId, page = 1, count = 10 } = req.body;
    const currentUserId = req.userId;

    if (!feedId) {
      res.status(400).json({ message: "Feed ID is required" });
      return;
    }

    // ------------------------------------------------------------------
    // Aggregation pipeline (keeps your original intent but enriches each
    // postreplies item with the actual reply post and that post's user,
    // so we don't need to run Post.findOne per nested reply later)
    // ------------------------------------------------------------------
    const pipeline: PipelineStage[] = [
      {
        $match: {
          parentId: new mongoose.Types.ObjectId(feedId),
          _type: 2,
          hidden: false,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * count },
      { $limit: count },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "users", // parent comment's user (array, usually one item)
        },
      },
      {
        $lookup: {
          from: "postreplies",
          let: { replyId: "$_id", feedId: "$parentId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$parentId", "$$replyId"] },
                    { $eq: ["$feedId", "$$feedId"] },
                  ],
                },
              },
            },
            // bring the actual reply Post document (if postreplies.reply references a Post)
            {
              $lookup: {
                from: "posts",
                localField: "reply",
                foreignField: "_id",
                as: "replyPost",
              },
            },
            {
              $unwind: {
                path: "$replyPost",
                preserveNullAndEmptyArrays: true,
              },
            },
            // bring user info for that reply post (replyPost.user)
            {
              $lookup: {
                from: "users",
                localField: "replyPost.user",
                foreignField: "_id",
                as: "replyPostUser",
              },
            },
            // also bring the user for the postreplies entry itself (if needed)
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "users",
              },
            },
          ],
          as: "replies", // now each replies[i] may contain replyPost and replyPostUser
        },
      },
    ];

    const countPipeline: PipelineStage[] = [
      {
        $match: {
          parentId: new mongoose.Types.ObjectId(feedId),
          _type: 2,
          hidden: false,
        },
      },
      { $count: "total" },
    ];

    // Run aggregation & count in parallel
    const [repliesRaw, countResult] = await Promise.all([
      Post.aggregate(pipeline),
      Post.aggregate(countPipeline),
    ]);

    const totalReplies = countResult.length > 0 ? countResult[0].total : 0;

    // ------------------------------------------------------------------
    // Build the final payload safely and correctly (no shared `temp` object)
    // ------------------------------------------------------------------
    const data: Reply[] = await Promise.all(
      (repliesRaw || []).map(async (replyDoc: any): Promise<Reply> => {
        // Parent (top-level) user info (from $lookup "users")
        const parentUser = Array.isArray(replyDoc.users) && replyDoc.users.length > 0 ? replyDoc.users[0] : null;

        // compute parent upvote status and votes (use existing replyDoc.votes if present)
        const parentVotes =
          typeof replyDoc.votes === "number"
            ? replyDoc.votes
            : await Upvote.countDocuments({ parentId: replyDoc._id }).catch(() => 0);

        const parentIsUpvoted =
          currentUserId && replyDoc._id
            ? Boolean(await Upvote.exists({ parentId: replyDoc._id, user: currentUserId }).catch(() => false))
            : false;

        // Build nested replies (one level deep)
        const nestedReplies: NestedReply[] = await Promise.all(
          (replyDoc.replies || []).map(async (r: any): Promise<NestedReply> => {
            // r is the postreplies doc from pipeline
            const replyPost = r.replyPost ?? null; // could be null if not found
            const replyPostUser = Array.isArray(r.replyPostUser) && r.replyPostUser.length > 0 ? r.replyPostUser[0] : null;
            const fallbackUser = Array.isArray(r.users) && r.users.length > 0 ? r.users[0] : null;

            // Decide which object holds the actual reply post id and content
            // Prefer replyPost (from lookup), otherwise fall back to r.reply (might be ObjectId),
            // otherwise fallback to r._id (the postreplies doc id)
            const replyPostId =
              replyPost?._id ??
              (r.reply && (typeof r.reply === "object" ? (r.reply._id ?? r.reply) : r.reply)) ??
              r._id;

            const idStr = replyPostId && replyPostId.toString ? replyPostId.toString() : String(replyPostId ?? "");

            const message = replyPost?.message ?? r.message ?? "";
            const date = replyPost?.createdAt ?? r.createdAt ?? new Date();

            const nestedUserId =
              replyPost?.user?.toString?.() ?? (r.user ? r.user.toString?.() ?? "" : "");
            const nestedUserName = replyPostUser?.name ?? fallbackUser?.name ?? "Unknown User";
            const nestedUserAvatar = replyPostUser?.avatarImage ?? fallbackUser?.avatarImage ?? null;
            const nestedLevel = replyPostUser?.level ?? fallbackUser?.level ?? 0;
            const nestedRoles = replyPostUser?.roles ?? fallbackUser?.roles ?? [];

            // votes & isUpvoted for this nested reply (based on the actual reply post id)
            const nestedVotes = replyPostId
              ? await Upvote.countDocuments({ parentId: replyPostId }).catch(() => 0)
              : 0;

            const nestedIsUpvoted =
              currentUserId && replyPostId
                ? Boolean(await Upvote.exists({ parentId: replyPostId, user: currentUserId }).catch(() => false))
                : false;

            return {
              id: idStr,
              message,
              date,
              userId: nestedUserId,
              userName: nestedUserName,
              userAvatar: nestedUserAvatar,
              level: nestedLevel,
              roles: nestedRoles,
              isUpvoted: nestedIsUpvoted,
              votes: nestedVotes,
            };
          })
        );

        return {
          id: replyDoc._id?.toString?.() ?? "",
          message: replyDoc.message ?? "",
          date: replyDoc.createdAt ?? new Date(),
          userId: replyDoc.user?.toString?.() ?? "",
          userName: parentUser?.name ?? "Unknown User",
          userAvatar: parentUser?.avatarImage ?? null,
          level: parentUser?.level ?? 0,
          roles: parentUser?.roles ?? [],
          votes: parentVotes,
          answers: replyDoc.answers || 0,
          isUpvoted: parentIsUpvoted,
          replies: nestedReplies,
        };
      })
    );

    res.status(200).json({
      count: totalReplies,
      replies: data,
      currentPage: page,
      totalPages: Math.ceil(totalReplies / count),
    });
  }
);

const replyComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { parentId, message, feedId  } = req.body;
    const currentUserId = req.userId;
    console.log(parentId, message, feedId)

    try{

        const newReply = await Post.create({
            _type: 6,
            title: "Title not required",
            parentId: parentId,
            message,
            tags: [],
            user: currentUserId,
            isAccepted: true
        })

        const postReply = await PostReplies.create({
            parentId: parentId, 
            reply: newReply._id,
            feedId: feedId
        })

        res.status(200).json({
            id: newReply._id,
            type: newReply._type,
            message: newReply.message
        });

    }catch(err) {
        console.log(err)
        res.status(500).send(err);
    }

    
})

const togglePinFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { feedId } = req.body;
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';

    // only moderators or admins can pin a message
    const user = await User.findById(currentUserId);

    if (!user || !user.roles.includes('Moderator') && !user.roles.includes('Admin')) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (!feedId) {
        res.status(400).json({ message: "Feed ID is required" });
        return;
    }

    const feed = await Post.findById(feedId);

    if (feed === null) {
        res.status(404).json({ message: "Feed not found" });
        return;
    }

    if (feed.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    feed.isPinned = !feed.isPinned;
    await feed.save();

    res.status(200).json({ success: true });
});

const getPinnedFeeds = asyncHandler(async (req: IAuthRequest, res: Response) => {
    // const currentUserId = req.userId;
    const currentUserId = '68a7400f3dd5eef60a166911';

    if(!currentUserId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const pinnedFeeds = await Post.find({ user: currentUserId, isPinned: true });

    res.status(200).json({ pinnedFeeds });
});


const feedController = {
    createFeed,
    editFeed,
    deleteFeed,
    createReply,
    editReply,
    deleteReply,
    toggleAcceptedAnswer,
    votePost,
    followFeed,
    unfollowFeed,
    shareFeed,
    getFeedList,
    getFeed,
    getReplies,
    togglePinFeed,
    getPinnedFeeds,
    replyComment
}

export default feedController;