import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Post from "../models/Post";
import Tag from "../models/Tag";
import Upvote from "../models/Upvote";
import PostFollowing from "../models/PostFollowing";
import Notification from "../models/Notification";
import mongoose, { PipelineStage, Types } from "mongoose";
import PostAttachment from "../models/PostAttachment";
import { escapeRegex } from "../utils/regexUtils";
import UserFollowing from "../models/UserFollowing";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import PostTypeEnum from "../data/PostTypeEnum";
import { parseWithZod } from "../utils/zodUtils";
import { createQuestionSchema, createReplySchema, deleteQuestionSchema, deleteReplySchema, editQuestionSchema, editReplySchema, followQuestionSchema, getQuestionListSchema, getQuestionSchema, getRepliesSchema, getVotersListSchema, toggleAcceptedAnswerSchema, unfollowQuestionSchema, votePostSchema } from "../validation/discussionSchema";
import RolesEnum from "../data/RolesEnum";
import { isAuthorizedRole } from "../utils/modelUtils";

const createQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createQuestionSchema, req);
    const { title, message, tags } = body;
    const currentUserId = req.userId;

    const tagIds: any[] = [];

    for (let tagName of tags) {
        const tag = await Tag.findOne({ name: tagName });
        if (tag) {
            tagIds.push(tag._id);
        }
    }

    const question = await Post.create({
        _type: PostTypeEnum.QUESTION,
        title,
        message,
        tags: tagIds,
        user: currentUserId
    })

    await PostFollowing.create({
        user: currentUserId,
        following: question._id
    });

    res.json({
        question: {
            id: question._id,
            title: question.title,
            message: question.message,
            tags: question.tags,
            date: question.createdAt,
            userId: question.user,
            isAccepted: question.isAccepted,
            votes: question.votes,
            answers: question.answers
        }
    });
});

const getQuestionList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getQuestionListSchema, req);
    const { page, count, filter, searchQuery, userId } = body;
    const currentUserId = req.userId;

    let pipeline: PipelineStage[] = [
        { $match: { _type: PostTypeEnum.QUESTION, hidden: false } },
        {
            $set: {
                score: { $add: ["$votes", "$answers"] }
            }
        }
    ]

    let dbQuery = Post
        .find({
            _type: PostTypeEnum.QUESTION,
            hidden: false
        })

    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = escapeRegex(searchQuery.trim());
        const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");

        const tagIds = (await Tag.find({ name: searchQuery.trim() }))
            .map(x => x._id);
        pipeline.push({
            $match: {
                $or: [
                    { title: searchRegex },
                    { "tags": { $in: tagIds } }
                ]
            }
        })
        dbQuery.where({
            $or: [
                { title: searchRegex },
                { "tags": { $in: tagIds } }
            ]
        })
    }

    switch (filter) {
        // Most Recent
        case 1: {
            pipeline.push({
                $sort: { createdAt: -1 }
            })
            dbQuery = dbQuery
                .sort({ createdAt: "desc" })
            break;
        }
        // Unanswered
        case 2: {
            pipeline.push({
                $match: { answers: 0 }
            }, {
                $sort: { createdAt: -1 }
            })
            dbQuery = dbQuery
                .where({ answers: 0 })
                .sort({ createdAt: "desc" })
            break;
        }
        // My Questions
        case 3: {
            if (!userId) {
                res.status(400).json({ error: [{ message: "Invalid request" }] });
                return
            }
            pipeline.push({
                $match: { user: new mongoose.Types.ObjectId(userId) }
            }, {
                $sort: { createdAt: -1 }
            })
            dbQuery = dbQuery
                .where({ user: userId })
                .sort({ createdAt: "desc" })
            break;
        }
        // My Replies
        case 4: {
            if (!userId) {
                res.status(400).json({ error: [{ message: "Invalid request" }] });
                return
            }
            const replies = await Post.find({ user: userId, _type: PostTypeEnum.ANSWER }).select("parentId");
            const questionIds = [...new Set(replies.map(x => x.parentId))];
            pipeline.push({
                $match: { _id: { $in: questionIds } }
            }, {
                $sort: { createdAt: -1 }
            })
            dbQuery = dbQuery
                .where({ _id: { $in: questionIds } })
                .sort({ createdAt: "desc" })
            break;
        }
        // Hot Today
        case 5: {
            let dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            pipeline.push({
                $match: { createdAt: { $gt: dayAgo } }
            }, {
                $sort: { score: -1 }
            })
            dbQuery = dbQuery
                .where({ createdAt: { $gt: dayAgo } })
                .sort({ votes: "desc" })
            break;
        }
        // Trending
        case 6: {
            pipeline.push({
                $sort: { score: -1 }
            })
            dbQuery = dbQuery
                .sort({ votes: "desc" })
            break;
        }
        default:
            res.status(400).json({ error: [{ message: "Unknown filter" }] });
            return;
    }

    const questionCount = await dbQuery.clone().countDocuments();

    pipeline.push({
        $skip: (page - 1) * count
    }, {
        $limit: count
    }, {
        $project: { message: 0 }
    }, {
        $lookup: { from: "users", localField: "user", foreignField: "_id", as: "users" }
    }, {
        $lookup: { from: "tags", localField: "tags", foreignField: "_id", as: "tags" }
    })

    const result = await Post.aggregate(pipeline)

    const data = result.map(x => ({
        id: x._id,
        title: x.title,
        tags: x.tags.map((y: any) => y.name),
        date: x.createdAt,
        userId: x.user._id,
        userName: x.users.length ? x.users[0].name : undefined,
        userAvatar: x.users.length ? x.users[0].avatarImage : undefined,
        level: x.users.length ? x.users[0].level : undefined,
        roles: x.users.length ? x.users[0].roles : undefined,
        answers: x.answers,
        votes: x.votes,
        isUpvoted: false,
        isAccepted: x.isAccepted,
        score: x.score
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

    res.status(200).json({ count: questionCount, questions: data });
});

const getQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getQuestionSchema, req);
    const { questionId } = body;
    const currentUserId = req.userId;

    const question = await Post.findById(questionId)
        .populate<{ user: any }>("user", "name avatarImage countryCode level roles")
        .populate<{ tags: any[] }>("tags", "name")
        .lean();

    if (question) {

        const isUpvoted = currentUserId ? (await Upvote.findOne({ parentId: questionId, user: currentUserId })) !== null : false;
        const isFollowed = currentUserId ? (await PostFollowing.findOne({ user: currentUserId, following: questionId })) !== null : false;
        const attachments = await PostAttachment.getByPostId({ post: questionId })

        res.json({
            question: {
                id: question._id,
                title: question.title,
                message: question.message,
                tags: question.tags.map((y: any) => y.name),
                date: question.createdAt,
                userId: question.user._id,
                userName: question.user.name,
                userAvatar: question.user.avatarImage,
                level: question.user.level,
                roles: question.user.roles,
                answers: question.answers,
                votes: question.votes,
                isUpvoted,
                isAccepted: question.isAccepted,
                isFollowed,
                attachments
            }
        });
    }
    else {
        res.status(404).json({ error: [{ message: "Question not found" }] })
    }
});

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createReplySchema, req);
    const { message, questionId } = body;
    const currentUserId = req.userId;

    const question = await Post.findById(questionId);
    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return
    }

    const reply = await Post.create({
        _type: PostTypeEnum.ANSWER,
        message,
        parentId: questionId,
        user: currentUserId
    })

    const questionFollowed = await PostFollowing.findOne({
        user: currentUserId,
        following: question._id
    })

    if (questionFollowed === null) {
        await PostFollowing.create({
            user: currentUserId,
            following: question._id
        });
    }

    const followers = await PostFollowing.find({ following: question._id });
    await Notification.sendToUsers(followers.filter(x => x.user != currentUserId).map(x => x.user) as Types.ObjectId[], {
        title: "New answer",
        type: NotificationTypeEnum.QA_ANSWER,
        actionUser: currentUserId!,
        message: `{action_user} posted in "${question.title}"`,
        questionId: question._id,
        postId: reply._id
    });

    if (question.user != currentUserId) {
        await Notification.sendToUsers([question.user as Types.ObjectId], {
            title: "New answer",
            type: NotificationTypeEnum.QA_ANSWER,
            actionUser: currentUserId!,
            message: `{action_user} answered your question "${question.title}"`,
            questionId: question._id,
            postId: reply._id
        });
    }

    question.$inc("answers", 1)
    await question.save();

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
});

const getReplies = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getRepliesSchema, req);
    const { questionId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    let dbQuery = Post.find({ parentId: questionId, _type: PostTypeEnum.ANSWER, hidden: false });

    let skipCount = index;

    if (findPostId) {

        const reply = await Post.findById(findPostId);

        if (reply === null) {
            res.status(404).json({ error: [{ message: "Post not found" }] })
            return
        }

        skipCount = Math.floor((await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()) / count) * count;

        dbQuery = dbQuery
            .sort({ createdAt: "asc" })
    }
    else {
        switch (filter) {
            // Most popular
            case 1: {
                dbQuery = dbQuery
                    .sort({ votes: "desc" })
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
                res.status(400).json({ error: [{ message: "Unknown filter" }] });
                return;
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles") as any[];

    const data = result.map((x, offset) => ({
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
        isAccepted: x.isAccepted,
        answers: x.answers,
        index: skipCount + offset,
        attachments: new Array()
    }))

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

    res.status(200).json({ posts: data })

});

const toggleAcceptedAnswer = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(toggleAcceptedAnswerSchema, req);
    const { accepted, postId } = body;
    const currentUserId = req.userId;

    const post = await Post.findById(postId);

    if (post === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] })
        return
    }

    const question = await Post.findById(post.parentId);
    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] })
        return
    }

    if (question.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] })
        return
    }

    if (accepted || post.isAccepted) {
        question.isAccepted = accepted;
        await question.save();
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

const editQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editQuestionSchema, req);
    const { questionId, title, message, tags } = body;
    const currentUserId = req.userId;

    const question = await Post.findById(questionId);

    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] })
        return
    }

    if (question.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] })
        return
    }

    const tagIds = (await Tag.getOrCreateTagsByNames(tags)).map(x => x._id);

    question.title = title;
    question.message = message;
    question.tags = tagIds;

    await question.save();

    const attachments = await PostAttachment.getByPostId({ post: question._id });

    res.json({
        success: true,
        data: {
            id: question._id,
            title: question.title,
            message: question.message,
            tags: question.tags,
            attachments
        }
    })

});

const deleteQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteQuestionSchema, req);
    const { questionId } = body;
    const currentUserId = req.userId;

    const question = await Post.findById(questionId);

    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] })
        return
    }

    if (question.user != currentUserId && !isAuthorizedRole(req, [RolesEnum.ADMIN, RolesEnum.MODERATOR])) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] })
        return
    }

    await Post.deleteAndCleanup({ _id: questionId });

    res.json({ success: true });
})

const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editReplySchema, req);
    const { replyId, message } = body;
    const currentUserId = req.userId;

    const reply = await Post.findById(replyId);

    if (reply === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] })
        return
    }

    if (currentUserId != reply.user) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return
    }

    reply.message = message;

    await reply.save();

    const attachments = await PostAttachment.getByPostId({ post: reply._id })

    res.json({
        success: true,
        data: {
            id: reply._id,
            message: reply.message,
            attachments
        }
    });
});

const deleteReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteReplySchema, req);
    const { replyId } = body;
    const currentUserId = req.userId;

    const reply = await Post.findById(replyId);

    if (reply === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] })
        return
    }

    if (currentUserId != reply.user && !isAuthorizedRole(req, [RolesEnum.ADMIN, RolesEnum.MODERATOR])) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return
    }

    const question = await Post.findById(reply.parentId);
    if (question === null) {
        res.status(404).json({ error: [{ message: "Question not found" }] })
        return
    }

    await Post.deleteAndCleanup({ _id: replyId });

    res.json({ success: true });
})

const votePost = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(votePostSchema, req);
    const { postId, vote } = body;
    const currentUserId = req.userId;

    const post = await Post.findById(postId);
    if (post === null) {
        res.status(404).json({ error: [{ message: "Post not found" }] })
        return
    }

    let upvote = await Upvote.findOne({ parentId: postId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = await Upvote.create({ user: currentUserId, parentId: postId });
            post.$inc("votes", 1);
            await post.save();
        }
    }
    else if (vote === 0) {
        if (upvote) {
            await Upvote.deleteOne({ _id: upvote._id });
            upvote = null;
            post.$inc("votes", -1);
            await post.save();
        }
    }

    res.json({ success: true, vote: upvote ? 1 : 0 });

})

const followQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(followQuestionSchema, req);
    const { postId } = body;
    const currentUserId = req.userId;

    const postExists = await Post.exists({ _id: postId, _type: PostTypeEnum.QUESTION })
    if (!postExists) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return
    }

    const exists = await PostFollowing.exists({ user: currentUserId, following: postId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }

    await PostFollowing.create({
        user: currentUserId,
        following: postId
    });

    res.json({ success: true });
});

const unfollowQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(unfollowQuestionSchema, req);
    const { postId } = body;
    const currentUserId = req.userId;

    const postExists = await Post.exists({ _id: postId, _type: PostTypeEnum.QUESTION })
    if (!postExists) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    const postFollowing = await PostFollowing.exists({ user: currentUserId, following: postId });
    if (postFollowing === null) {
        res.status(204).json({ success: true });
        return;
    }

    await PostFollowing.deleteOne({ user: currentUserId, following: postId });
    res.json({ success: true });
});

const getVotersList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getVotersListSchema, req);
    const { parentId, page, count } = body;
    const currentUserId = req.userId;

    const result = await Upvote.find({ parentId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate<{ user: any }>("user", "name avatarImage countryCode level roles")
        .select("user");

    const promises: Promise<void>[] = [];
    const data = result.map(x => ({
        id: x.user._id,
        name: x.user.name,
        avatar: x.user.avatarImage,
        countryCode: x.user.countryCode,
        level: x.user.level,
        roles: x.user.roles,
        isFollowing: false
    }));

    for (let i = 0; i < data.length; ++i) {
        const user = data[i];
        promises.push(UserFollowing.countDocuments({ user: currentUserId, following: user.id })
            .then(exists => {
                data[i].isFollowing = exists !== null;
            }));
    }

    await Promise.all(promises);

    res.json({
        success: true,
        data
    });
});

const discussController = {
    createQuestion,
    getQuestionList,
    getQuestion,
    createReply,
    getReplies,
    toggleAcceptedAnswer,
    editQuestion,
    deleteQuestion,
    editReply,
    deleteReply,
    votePost,
    followQuestion,
    unfollowQuestion,
    getVotersList
}

export default discussController;