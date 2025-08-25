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


const createFeed = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { title, message, tags } = req.body;
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';

    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const tagIds: any[] = [];

    for (let tagName of tags) {
        const tag = await Tag.getOrCreateTagByName(tagName);
        if (!tag) {
            res.status(400).json({ message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }

    if (tagIds.length < 1) {
        res.status(400).json({ message: `Empty Tag` });
        return;
    }

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


    const { feedId, title, message, tags } = req.body;

    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const feed = await Post.findById(feedId);

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
    if (vote === 1) {
        if (!upvote) {
            upvote = await Upvote.create({ user: currentUserId, parentId: postId })
            post.$inc("votes", 1)
            await post.save();
        }
    }
    else if (vote === 0) {
        if (upvote) {
            await Upvote.deleteOne({ _id: upvote._id });
            upvote = null;
            post.$inc("votes", -1)
            await post.save();
        }
    }

    res.json({ vote: upvote ? 1 : 0 });

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
    const { feedId, title, message, tags } = req.body;
    const currentUserId = req.userId;
    // const currentUserId = '68a7400f3dd5eef60a166911';

    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const tagIds: any[] = [];

    for (let tagName of tags) {
        const tag = await Tag.getOrCreateTagByName(tagName); // Create tag on fly --revisit
        if (!tag) {
            res.status(400).json({ message: `${tagName} does not exists` });
            return;
        }
        tagIds.push(tag._id);
    }

    if (tagIds.length < 1) {
        res.status(400).json({ message: `Empty Tag` });
        return;
    }

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
            isUpvoted: false,
            isShared: false,
            isFollowing: false,
            score: x.score || 0,
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
        userAvatar: feed.users.length ? feed.users[0].avatarImage : null,
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
            userAvatar: original.originalUser.length ? original.originalUser[0].avatarImage : null
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

const getReplies = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { feedId, page = 1, count = 10 } = req.body;
    const currentUserId = req.userId;

    if (!feedId) {
        res.status(400).json({ message: "Feed ID is required" });
        return;
    }

    const pipeline: PipelineStage[] = [
        { 
            $match: { 
                parentId: new mongoose.Types.ObjectId(feedId), 
                _type: 2, // Comments/replies
                hidden: false 
            } 
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * count },
        { $limit: count },
        { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "users" } }
    ];

    const countPipeline: PipelineStage[] = [
        { 
            $match: { 
                parentId: new mongoose.Types.ObjectId(feedId), 
                _type: 2,
                hidden: false 
            } 
        },
        { $count: "total" }
    ];

    const [replies, countResult] = await Promise.all([
        Post.aggregate(pipeline),
        Post.aggregate(countPipeline)
    ]);

    const totalReplies = countResult.length > 0 ? countResult[0].total : 0;

    const data = replies.map(reply => ({
        id: reply._id,
        message: reply.message,
        date: reply.createdAt,
        userId: reply.user,
        userName: reply.users.length ? reply.users[0].name : "Unknown User",
        userAvatar: reply.users.length ? reply.users[0].avatarImage : null,
        level: reply.users.length ? reply.users[0].level : 0,
        roles: reply.users.length ? reply.users[0].roles : [],
        votes: reply.votes || 0,
        answers: reply.answers || 0, // For nested replies
        isUpvoted: false
    }));

    // Check if user upvoted any replies
    if (currentUserId && data.length > 0) {
        const replyIds = data.map(r => r.id);
        const upvotes = await Upvote.find({ 
            parentId: { $in: replyIds }, 
            user: currentUserId 
        });
        
        const upvotedIds = new Set(upvotes.map(u => u.parentId.toString()));
        data.forEach(reply => {
            reply.isUpvoted = upvotedIds.has(reply.id.toString());
        });
    }

    res.status(200).json({
        count: totalReplies,
        replies: data,
        currentPage: page,
        totalPages: Math.ceil(totalReplies / count)
    });
});

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
    getPinnedFeeds
}

export default feedController;