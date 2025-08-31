import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Post from "../models/Post";
import Tag from "../models/Tag";
import Upvote from "../models/Upvote";
import PostFollowing from "../models/PostFollowing";
import Notification from "../models/Notification";
import mongoose, { PipelineStage } from "mongoose";
import PostAttachment from "../models/PostAttachment";
import { escapeRegex } from "../utils/regexUtils";
import User from "../models/User";
import UserFollowing from "../models/UserFollowing";

const notificationMessage = (message: (string | undefined)) => {
    if(!message) return "";
    if(message.length < 15) return message;
    return message.substring(0, 15) + "...";
}


const createFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { message } = req.body;
    let { title } = req.body;
    let { tags } = req.body;
    const currentUserId = req.userId;

    if (typeof message === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return
    }

    const tagIds: any[] = [];

    if(!title) title = "Title not provided.";

    if(!tags) tags = [];

    for (let tagName of tags) {
        const tag = await Tag.findOne({ name: tagName });
        if (!tag) {
            res.status(400).json({ success: false, message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }

    // if (tagIds.length < 1) {
    //     res.status(400).json({ success: false, message: `Empty Tag` });
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

        const followers = await UserFollowing.find({ following: currentUserId })

        followers.forEach(async (follower) => {
            await Notification.create({
                _type: 301,
                user: follower.user,
                actionUser: currentUserId,
                message: `{action_user} made a new post "${notificationMessage(feed.message)}"`,
                feedId: feed._id,    
            });
        })

        res.json({
            success: true,
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
        res.status(500).json({ success: false, message: "Error" });
    }

});

const editFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';


    const { feedId, message } = req.body;
    let  { title, tags } = req.body;

    if (typeof message === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return
    }

    const feed = await Post.findById(feedId);

    if(!title) title = "Title not provided."
    if(!tags) tags = [];

    if (feed === null) {
        res.status(404).json({ success: false, message: "Feed not found" })
        return
    }

    if (feed.user != currentUserId) {
        res.status(401).json({ success: false, message: "Unauthorized" })
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
            message: err,
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
        res.status(404).json({ success: false, message: "Feed not found" })
        return
    }

    if (feed.user != currentUserId) {
        res.status(401).json({ success: false, message: "Unauthorized" })
        return
    }

    try {
        await Post.deleteAndCleanup({ _id: feedId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, message: err })
    }
})

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { message, feedId } = req.body;

    if(!currentUserId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    const feed = await Post.findById(feedId);
    if (!feed) {
        res.status(404).json({ success: false, message: "Feed not found" });
        return;
    }

    const reply = await Post.create({
        _type: 2,
        message,
        parentId: feedId,
        user: currentUserId
    });

    if (!reply) {
        res.status(500).json({ success: false, message: "Error creating reply" });
        return;
    }

    // auto-follow the feed if not already
    const feedFollowed = await PostFollowing.findOne({
        user: currentUserId,
        following: feed._id
    });

    if (!feedFollowed) {
        await PostFollowing.create({
            user: currentUserId,
            following: feed._id
        });
    }

    // notify feed owner
    if (currentUserId.toString() !== feed.user.toString()) {
        await Notification.create({
            _type: 301,
            user: feed.user,
            actionUser: currentUserId,
            message: `{action_user} commented on your Post "${notificationMessage(feed.message)}"`,
            feedId: feed._id,
            postId: reply._id
        });
    }

    feed.$inc("answers", 1);
    await feed.save();

    // attachments
    const attachments = await PostAttachment.getByPostId({ post: reply._id });

    // enrich reply with user & votes (to match getReplies)
    const user = await User.findById(reply.user);
    const votes = await Upvote.countDocuments({ parentId: reply._id });
    const isUpvoted = Boolean(await Upvote.exists({ parentId: reply._id, user: currentUserId }));
    const childrenCount = await Post.countDocuments({ parentId: reply._id, hidden: false });

    res.json({
        success: true,
        post: {
            id: reply._id.toString(),
            message: reply.message,
            date: reply.createdAt,
            userId: reply.user.toString(),
            userName: user?.name ?? "Unknown User",
            userAvatar: user?.avatarImage ?? null,
            level: user?.level ?? 0,
            roles: user?.roles ?? [],
            parentId: reply.parentId?.toString() ?? null,
            isAccepted: reply.isAccepted ?? false,
            votes,
            isUpvoted,
            replyCount: childrenCount,
            replies: [], // for consistency with getReplies
            answers: reply.answers ?? 0,
            attachments
        }
    });
});


const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    // const currentUserId = "68a7400f3dd5eef60a166911";
    const { replyId, message } = req.body;

    if (typeof message === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" })
        return
    }

    const reply = await Post.findById(replyId);

    if (reply === null) {
        res.status(404).json({ success: false, message: "Post not found" })
        return
    }

    if (currentUserId != reply.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
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
            message: err,
            data: null
        })
    }

});

const deleteReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const { replyId, feedId } = req.body;

    const reply = await Post.findById(replyId);

    if (reply === null) {
        res.status(404).json({ success: false, message: "Post not found" })
        return
    }

    if (currentUserId != reply.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return
    }

    const feed = await Post.findById(reply.parentId);
    if (feed === null) {
        res.status(404).json({ success: false, message: "Feed not found" })
        return
    }

    const originalPost = await Post.findById({ _id: feedId })
    if(originalPost) {
        originalPost.$inc("answers", -1);
        await originalPost.save()
    }

    try {
        await Post.deleteAndCleanup({ _id: replyId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, message: err })
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
        res.status(404).json({ success: false, message: "Feed not found" })
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
    const { postId, vote } = req.body;
    if (typeof vote === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return
    }

    const post = await Post.findById(postId);
    if (post === null) {
        res.status(404).json({ success: false, message: "Comment not found" })
        return
    }

    let feed = await Post.findById(post.parentId)

    let midfix = "";
    if(post._type === 4 || post._type == 5) midfix = " liked your post ";
    else if(post._type == 2) midfix = " liked your comment "
    else if(post._type == 6) midfix = " liked your reply "

    let originalFeed;
    if(post._type === 6) {
        originalFeed = await Post.findById(feed?.parentId)
    }

    let codeId;
    if(post._type === 4 || post._type == 5) {
        codeId = post._id;
    }else if(post._type === 2) {
        codeId = feed?._id;
    }else if(post._type === 6) {
        codeId = originalFeed?._id
    }


    let upvote = await Upvote.findOne({ parentId: postId, user: currentUserId });
    if (vote === true) {
        if (!upvote) {
            upvote = await Upvote.create({ user: currentUserId, parentId: postId })
            post.$inc("votes", 1)
            await post.save();
            if(currentUserId != post.user) {
                await Notification.create({
                    _type: 301,
                    user: post.user,
                    actionUser: currentUserId,
                    message: (post._type !== 4 && post._type !== 5) ? `{action_user} ${midfix} "${notificationMessage(post.message)}" on post "${notificationMessage(feed?.message)}"` : `{action_user} ${midfix} "${notificationMessage(post.message)}"`,
                    feedId: codeId 
                });
            }
        
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

    res.json({ success: true, vote: upvote ? 1 : 0, votes: post.votes });

})

const followFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { postId } = req.body;

    if (typeof postId === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return
    }

    const postExists = await Post.findOne({ _id: postId })
    if (!postExists) {
        res.status(404).json({ success: false, message: "Post not found" });
        return
    }

    if (postExists._type !== 1) {
        res.status(405).json({ success: false, message: "Post is not a feed" });
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

    res.status(500).json({ success: false, message: "Something went wrong" });
});

const unfollowFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { postId } = req.body;

    if (typeof postId === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return
    }

    const postExists = await Post.findOne({ _id: postId })
    if (!postExists) {
        res.status(404).json({ success: false, message: "Post not found" });
        return
    }

    if (postExists._type !== 1) {
        res.status(405).json({ success: false, message: "Post is not a feed" });
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

    res.status(500).json({ success: false, message: "Something went wrong" });
});

const shareFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { feedId, message } = req.body;
    let { title } = req.body;
    let { tags } = req.body;
    const currentUserId = req.userId;

    if (typeof message === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return
    }

    if(!title) title = "Title not provided."

    const tagIds: any[] = [];

    if(!tags) tags = []

    for (let tagName of tags) {
        const tag = await Tag.findOne({ name: tagName });
        if (!tag) {
            res.status(400).json({ success: false, message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }

    const tagNames: any[] = [];
    for (let tagId of tagIds) {
        const tag = await Tag.findById(tagId);
        if (tag) {
            tagNames.push(tag);
        }
    }

    const feed = await Post.create({
        _type: 5,
        title,
        message,
        tags: tagIds,
        user: currentUserId,
        isAccepted: true,
        sharedFrom: feedId,
        isOriginalPostDeleted: 0
    })

    if (feed) {

        await PostFollowing.create({
            user: currentUserId,
            following: feed._id
        });

        const post = await Post.findById(feedId);

        if(post) {
            post.$inc("shares", 1)
            await post.save();
        }

        const originalFeed = await Post.findById(feedId);
        if(!originalFeed) {
            res.status(404).json({ "message": "Feed is not available" });
            return;
        }

        if(originalFeed.user != currentUserId) {
            await Notification.create({
                _type: 301,
                user: originalFeed.user,
                actionUser: currentUserId,
                message: `{action_user} shared your Post "${notificationMessage(originalFeed.message)}"`,
                feedId: feed._id,    
            });
        }


        res.json({
            success: true,
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
        res.status(500).json({ success: false, message: "Error" });
    }

});


const getFeedList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { page, count, filter, searchQuery } = req.body;
    const currentUserId = req.userId;

    if (typeof page === "undefined" || typeof count === "undefined" || typeof filter === "undefined" || typeof searchQuery === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
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
                res.status(400).json({ success: false, message: "Invalid request - userId required" });
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
                res.status(400).json({ success: false, message: "Authentication required" });
                return;
            }

            const followingUsers = await UserFollowing.find({ 
                user: currentUserId 
            }).select("following");

            const followingUserIds = followingUsers.map(f => f.following);

            if (followingUserIds.length === 0) {
                res.status(200).json({
                    count: 0,
                    feeds: [],
                    success: true
                });
                return;
            }


            pipeline.push(
                { $match: { user: { $in: followingUserIds } } },
                { $sort: { createdAt: -1 } }
            );

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
        
        case 7: {
            pipeline.push(
                { $match: { isPinned: true } },
                { $sort: { createdAt: -1 } }
            );
            break;
        }


        default:
            res.status(400).json({ success: false, message: "Unknown filter" });
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
            from: "postattachments",
            localField: "_id",
            foreignField: "postId",
            as: "attachments"
        }
    },
    {
        $lookup: {
            from: "posts",
            localField: "sharedFrom",
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
    },

  
    {
        $graphLookup: {
            from: "posts",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parentId",
            as: "allReplies",
            restrictSearchWithMatch: { hidden: false }
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
            tags: x.tags,
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
            isOriginalPostDeleted: x.isOriginalPostDeleted,
            attachments: x.attachments?.map((a: any) => ({
                id: a._id,
                type: a.type,    
                url: a.url,
                meta: a.meta || null
            })) || [],  
            originalPost: x.originalPost.length ? {
                id: x.originalPost[0]._id,
                title: x.originalPost[0].title || null,
                message: x.originalPost[0].message,
                tags: x.originalPost[0].tags,
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

                promises.push(PostAttachment.getByPostId({ post: data[i].id })
                    .then(attachments => {
                        data[i].attachments = attachments;
                    }));
            }
        }

        await Promise.all(promises);

        res.status(200).json({
            count: feedCount,
            feeds: data,
            success: true
        });
    } else {
        res.status(500).json({ success: false, message: "Error fetching feed" });
    }
});

// Helper function to recursively count all comments (including nested replies)
async function getTotalCommentsCount(parentId: mongoose.Types.ObjectId): Promise<number> {
  const directReplies = await Post.find({ parentId, hidden: false }).select('_id');
  
  let totalCount = directReplies.length; // Count direct replies
  
  // Recursively count nested replies
  for (const reply of directReplies) {
    totalCount += await getTotalCommentsCount(reply._id);
  }
  
  return totalCount;
}

const getFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { feedId } = req.body;
  const currentUserId = req.userId;

  if (!feedId) {
    res.status(400).json({ success: false, message: "Feed ID is required" });
    return;
  }

  let pipeline: PipelineStage[] = [
    { $match: { _id: new mongoose.Types.ObjectId(feedId), hidden: false } },
    { $set: { score: { $add: ["$votes", "$shares", "$answers"] } } },
    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "users" } },
    { $lookup: { from: "tags", localField: "tags", foreignField: "_id", as: "tags" } },
    { $lookup: { from: "postattachments", localField: "_id", foreignField: "postId", as: "attachments" } },
    { 
      $lookup: {
        from: "posts",
        localField: "sharedFrom",
        foreignField: "_id",
        as: "originalPost",
        pipeline: [
          { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "users" } },
          { $lookup: { from: "tags", localField: "tags", foreignField: "_id", as: "tags" } },
          { $limit: 1 }
        ]
      }
    },
    // keep direct replies count if you still need it
    {
      $lookup: {
        from: "posts",
        let: { postId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$parentId", "$$postId"] }, hidden: false } },
          { $count: "count" }
        ],
        as: "directRepliesCount"
      }
    },
    {
      $addFields: {
        directAnswers: {
          $cond: {
            if: { $gt: [{ $size: "$directRepliesCount" }, 0] },
            then: { $arrayElemAt: ["$directRepliesCount.count", 0] },
            else: 0
          }
        }
      }
    }
  ];

  const result = await Post.aggregate(pipeline);

  if (!result.length) {
    res.status(404).json({ success: false, message: "Feed not found" });
    return;
  }

  let feed = result[0];
  const attachments = await PostAttachment.getByPostId({ post: feed._id });

  let data = {
    id: feed._id,
    type: feed._type,
    title: feed.title || null,
    message: feed.message,
    tags: feed.tags,
    date: feed.createdAt,
    userId: feed.user,
    userName: feed.users.length ? feed.users[0].name : "Unknown User",
    userAvatarImage: feed.users.length ? feed.users[0].avatarImage || null : null,
    answers: feed.answers, // ✅ from DB
    directAnswers: feed.directAnswers || 0, // optional, direct replies only
    votes: feed.votes || 0,
    shares: feed.shares || 0,
    level: feed.users[0]?.level,
    roles: feed.users[0]?.roles,
    isUpvoted: false,
    isShared: false,
    isFollowing: false,
    score: feed.score || 0,
    isPinned: feed.isPinned,
    isOriginalPostDeleted: feed.isOriginalPostDeleted,
    attachments: attachments,
    originalPost: feed.originalPost.length ? {
      id: feed.originalPost[0]._id,
      title: feed.originalPost[0].title || null,
      message: feed.originalPost[0].message,
      tags: feed.originalPost[0].tags,
      userId: feed.originalPost[0].user,
      userName: feed.originalPost[0].users.length ? feed.originalPost[0].users[0].name : "Unknown User",
      userAvatarImage: feed.originalPost[0].users.length ? feed.originalPost[0].users[0].avatarImage || null : null,
      date: feed.originalPost[0].createdAt
    } : null
  };

  if (currentUserId) {
    const [upvote, following] = await Promise.all([
      Upvote.findOne({ parentId: data.id, user: currentUserId }),
      PostFollowing.findOne({ following: data.id, user: currentUserId })
    ]);
    data.isUpvoted = !!upvote;
    data.isFollowing = !!following;
  }

  res.status(200).json({ feed: data, success: true });
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

export interface ReplyNode {
  id: string;
  message: string;
  date: Date;
  userId: string;
  userName: string;
  userAvatar: string | null;
  level: number;
  roles: string[];
  votes: number;
  isUpvoted: boolean;
  replies: ReplyNode[];
}


// Controller with pagination at top-level
const getReplies = asyncHandler(
  async (req: IAuthRequest, res: Response): Promise<void> => {
    const { feedId, page = 1, count = 10 } = req.body;
    const currentUserId = (req as any).userId;

    if (!feedId) {
      res.status(400).json({ success: false, message: "Feed ID is required" });
      return;
    }

    const filter = {
      parentId: new mongoose.Types.ObjectId(feedId),
      hidden: false,
    };

    const totalReplies = await Post.countDocuments(filter);

    const topLevelReplies = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * count)
      .limit(count);

    const data: ReplyNode[] = await Promise.all(
      topLevelReplies.map(async (reply) => {
        const votes = await Upvote.countDocuments({ parentId: reply._id });
        const isUpvoted = currentUserId
          ? Boolean(await Upvote.exists({ parentId: reply._id, user: currentUserId }))
          : false;

        const user = await User.findById(reply.user);

        // 🔹 CHANGED: Instead of loading all children, just count them
        const childrenCount = await Post.countDocuments({ 
          parentId: reply._id, 
          hidden: false 
        });

        return {
          id: reply._id.toString(),
          message: reply.message,
          date: reply.createdAt,
          userId: reply.user.toString(),
          userName: user?.name ?? "Unknown User",
          userAvatar: user?.avatarImage ?? null,
          level: user?.level ?? 0,
          roles: user?.roles ?? [],
          votes,
          isUpvoted,
          replyCount: childrenCount, 
          replies: [], 
        };
      })
    );

    res.status(200).json({
      success: true,
      count: totalReplies,
      replies: data,
      currentPage: page,
      totalPages: Math.ceil(totalReplies / count),
    });
  }
);

const getNestedReplies = asyncHandler(
  async (req: IAuthRequest, res: Response): Promise<void> => {
    const { parentId, page = 1, count = 5 } = req.body; // Smaller count for nested replies
    const currentUserId = (req as any).userId;

    console.log("fuck")

    if (!parentId) {
      res.status(400).json({ success: false, message: "Parent ID is required" });
      return;
    }

    const filter = {
      parentId: new mongoose.Types.ObjectId(parentId),
      hidden: false,
    };

    const totalReplies = await Post.countDocuments(filter);

    const replies = await Post.find(filter)
      .sort({ createdAt: 1 }) 
      .skip((page - 1) * count)
      .limit(count);

    const data: ReplyNode[] = await Promise.all(
      replies.map(async (reply) => {
        const votes = await Upvote.countDocuments({ parentId: reply._id });
        const isUpvoted = currentUserId
          ? Boolean(await Upvote.exists({ parentId: reply._id, user: currentUserId }))
          : false;

        const user = await User.findById(reply.user);

        const childrenCount = await Post.countDocuments({ 
          parentId: reply._id, 
          hidden: false 
        });

        return {
          id: reply._id.toString(),
          message: reply.message,
          date: reply.createdAt,
          userId: reply.user.toString(),
          userName: user?.name ?? "Unknown User",
          userAvatar: user?.avatarImage ?? null,
          level: user?.level ?? 0,
          roles: user?.roles ?? [],
          votes,
          isUpvoted,
          replyCount: childrenCount, 
          replies: [],
        };
      })
    );

    res.status(200).json({
      success: true,
      replies: data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReplies / count),
        totalCount: totalReplies,
        hasMore: (page * count) < totalReplies,
      },
    });
  }
);


const replyComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { parentId, message, feedId } = req.body;
    const currentUserId = req.userId;

    if (!currentUserId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
    }

    try {
        // 1. Create new reply
        const newReply = await Post.create({
            _type: 6,
            title: "Title not required",
            parentId: parentId,
            message,
            tags: [],
            user: currentUserId,
            isAccepted: true
        });

        // 4. Fetch reply user details
        const user = await User.findOne({ _id: currentUserId });

        const formattedReply = {
            id: newReply._id.toString(),
            message: newReply.message,
            date: newReply.createdAt,
            userId: currentUserId.toString(),
            userName: user?.name ?? "Unknown User",
            userAvatar: user?.avatarImage ?? null,
            level: user?.level ?? 0,
            roles: user?.roles ?? [],
            votes: 0,
            isUpvoted: false,
            replies: [],
            answers: 0 
        };

        // 5. Validate parent + feed
        const feed = await Post.findById(parentId);
        if (!feed) {
            res.status(404).json({ success: false, message: "Comment is not available" });
            return;
        }

        const originalFeed = await Post.findById(feedId);
        if (!originalFeed) {
            res.status(404).json({ success: false, message: "Feed is not available" });
            return;
        }

        console.log(originalFeed.answers)
        originalFeed.$inc("answers", 1)
        await originalFeed.save();
        console.log(originalFeed.answers)

        // 6. Send notification if reply is not from same user
        if (currentUserId != feed.user.toString()) {
            await Notification.create({
                _type: 301,
                user: feed.user,
                actionUser: currentUserId,
                message: `{action_user} replied to your comment "${notificationMessage(feed.message)}" on post "${notificationMessage(originalFeed?.message)}"`,
                feedId: originalFeed._id,
                postId: newReply._id
            });
        }

        res.status(200).json({ reply: formattedReply, success: true });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err, success: false });
    }
});


const togglePinFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { feedId } = req.body;
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';

    // only moderators or admins can pin a message
    const user = await User.findById(currentUserId);

    if (!user || !user.roles.includes('Moderator') && !user.roles.includes('Admin')) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }

    if (!feedId) {
        res.status(400).json({ success: false, message: "Feed ID is required" });
        return;
    }

    const feed = await Post.findById(feedId);

    if (feed === null) {
        res.status(404).json({ success: false, message: "Feed not found" });
        return;
    }

    

    if(currentUserId != feed.user) {
        await Notification.create({
            _type: 301,
            user: feed.user,
            actionUser: currentUserId,
            message: `{action_user} pinned your Post "${notificationMessage(feed.message)}"`,
            feedId: feed._id,    
        });
    }

    feed.isPinned = !feed.isPinned;
    await feed.save();

    res.status(200).json({ success: true });
});

const getPinnedFeeds = asyncHandler(async (req: IAuthRequest, res: Response) => {
    // const currentUserId = req.userId;
    const currentUserId = '68a7400f3dd5eef60a166911';

    if(!currentUserId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }

    const pinnedFeeds = await Post.find({ user: currentUserId, isPinned: true });

    res.status(200).json({ pinnedFeeds, success: true });
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
    replyComment,
    getNestedReplies
}

export default feedController;