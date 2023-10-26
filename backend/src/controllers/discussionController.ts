import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Post from "../models/Post";
import Tag from "../models/Tag";
import Upvote from "../models/Upvote";
import Code from "../models/Code";
import PostFollowing from "../models/PostFollowing";
import Notification from "../models/Notification";
import { PipelineStage } from "mongoose";
import PostAttachment from "../models/PostAttachment";

const createQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { title, message, tags } = req.body;
    const currentUserId = req.userId;
    const emailVerified = req.emailVerified;

    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if (!emailVerified) {
        res.status(401).json({ message: "Activate your account" })
        return
    }

    const tagIds: any[] = [];
    let promises: Promise<void>[] = [];

    for (let tagName of tags) {
        promises.push(Tag.getOrCreateTagByName(tagName)
            .then(tag => {
                tagIds.push(tag._id);
            })
        )
    }

    await Promise.all(promises);

    const question = await Post.create({
        _type: 1,
        title,
        message,
        tags: tagIds,
        user: currentUserId
    })

    if (question) {

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
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});

const getQuestionList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { page, count, filter, searchQuery, userId } = req.body;
    const currentUserId = req.userId;

    if (typeof page === "undefined" || typeof count === "undefined" || typeof filter === "undefined" || typeof searchQuery === "undefined" || typeof userId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    let pipeline: PipelineStage[] = [
        { $match: { _type: 1 } },
        {
            $set: {
                score: { $add: ["$votes", "$answers"] }
            }
        }
    ]

    let dbQuery = Post
        .find({
            _type: 1
        })

    if (searchQuery.trim().length) {
        const tagIds = (await Tag.find({ name: searchQuery.trim() }))
            .map(x => x._id);
        pipeline.push({
            $match: {
                $or: [
                    { title: new RegExp("^" + searchQuery.trim(), "i") },
                    { "tags": { $in: tagIds } }
                ]
            }
        })
        dbQuery.where({
            $or: [
                { title: new RegExp("^" + searchQuery.trim(), "i") },
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
            if (userId === null) {
                res.status(400).json({ message: "Invalid request" });
                return
            }
            pipeline.push({
                $match: { user: userId }
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
            if (userId === null) {
                res.status(400).json({ message: "Invalid request" });
                return
            }
            const replies = await Post.find({ user: userId, _type: 2 }).select("parentId");
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
            throw new Error("Unknown filter");
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
    /*const result = await dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .select("-message")
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("tags", "name") as any[];*/

    const result = await Post.aggregate(pipeline)

    if (result) {
        const data = result.map(x => ({
            id: x._id,
            title: x.title,
            tags: x.tags.map((y: any) => y.name),
            date: x.createdAt,
            userId: x.user._id,
            userName: x.users.length ? x.users[0].name : undefined,
            avatarUrl: x.users.length ? x.users[0].avatarUrl : undefined,
            countryCode: x.users.length ? x.users[0].countryCode : undefined,
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
            /*promises.push(Post.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].answers = count;
            }));*/
            /*promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].votes = count;
            }));*/
            if (currentUserId) {
                promises.push(Upvote.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                    data[i].isUpvoted = !(upvote === null);
                }));
            }
        }

        await Promise.all(promises);

        res.status(200).json({ count: questionCount, questions: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});

const getQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { questionId } = req.body;

    const question = await Post.findById(questionId)
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("tags", "name") as any;

    if (question) {

        //const answers = await Post.countDocuments({ parentId: questionId });
        //const votes = await Upvote.countDocuments({ parentId: questionId });
        const isUpvoted = currentUserId ? (await Upvote.findOne({ parentId: questionId, user: currentUserId })) !== null : false;
        const isFollowed = currentUserId ? (await PostFollowing.findOne({ user: currentUserId, following: questionId })) !== null : false;
        const attachments = await PostAttachment.getByPostId(questionId)

        res.json({
            question: {
                id: question._id,
                title: question.title,
                message: question.message,
                tags: question.tags.map((y: any) => y.name),
                date: question.createdAt,
                userId: question.user._id,
                userName: question.user.name,
                avatarUrl: question.user.avatarUrl,
                countryCode: question.user.countryCode,
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
        res.status(404).json({ message: "Question not found" })
    }
});

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const emailVerified = req.emailVerified;
    const { message, questionId } = req.body;

    if (!emailVerified) {
        res.status(401).json({ message: "Activate your account" });
        return
    }

    const question = await Post.findById(questionId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" });
        return
    }

    const reply = await Post.create({
        _type: 2,
        message,
        parentId: questionId,
        user: currentUserId
    })

    if (reply) {

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

        const followers = new Set(((await PostFollowing.find({ following: question._id })) as any[]).map(x => x.user.toString()));
        followers.add(question.user.toString())
        followers.delete(currentUserId)

        for (let userToNotify of followers) {

            await Notification.create({
                _type: 201,
                user: userToNotify,
                actionUser: currentUserId,
                message: userToNotify === question.user.toString() ?
                    `{action_user} answered your question "${question.title}"`
                    :
                    `{action_user} posted in "${question.title}"`,
                questionId: question._id,
                postId: reply._id
            })
        }

        question.$inc("answers", 1)
        await question.save();

        const attachments = await PostAttachment.getByPostId(reply._id.toString())

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

const getReplies = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { questionId, index, count, filter, findPostId } = req.body;

    if (typeof index === "undefined" || typeof count === "undefined" || typeof filter === "undefined" || typeof findPostId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    let dbQuery = Post.find({ parentId: questionId, _type: 2 });

    let skipCount = index;

    if (findPostId) {

        const reply = await Post.findById(findPostId);

        if (reply === null) {
            res.status(404).json({ message: "Post not found" })
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
                throw new Error("Unknown filter");
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles") as any[];

    if (result) {
        const data = result.map((x, offset) => ({
            id: x._id,
            parentId: x.parentId,
            message: x.message,
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
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
            /*promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].votes = count;
            }));*/
            if (currentUserId) {
                promises.push(Upvote.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                    data[i].isUpvoted = !(upvote === null);
                }));
            }
            promises.push(PostAttachment.getByPostId(data[i].id).then(attachments => data[i].attachments = attachments));
        }

        await Promise.all(promises);

        res.status(200).json({ posts: data })
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});

const getTags = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { query } = req.body;

    if (typeof query === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if (query.length < 3) {
        res.json({ tags: [] })
    }
    else {
        const result = await Tag.find({ name: new RegExp("^" + query) });

        res.json({
            tags: result.map(x => x.name)
        })
    }
});

const toggleAcceptedAnswer = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { accepted, postId } = req.body;

    const post = await Post.findById(postId);

    if (post === null) {
        res.status(404).json({ success: false, message: "Post not found" })
        return
    }

    const question = await Post.findById(post.parentId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" })
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
    const currentUserId = req.userId;

    const { questionId, title, message, tags } = req.body;

    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const question = await Post.findById(questionId);

    if (question === null) {
        res.status(404).json({ message: "Question not found" })
        return
    }

    if (question.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" })
        return
    }

    const tagIds: any[] = [];
    let promises: Promise<void>[] = [];

    for (let tagName of tags) {
        promises.push(Tag.getOrCreateTagByName(tagName)
            .then(tag => {
                tagIds.push(tag._id);
            })
        )
    }

    await Promise.all(promises);

    question.title = title;
    question.message = message;
    question.tags = tagIds;

    try {
        await question.save();

        res.json({
            success: true,
            data: {
                id: question._id,
                title: question.title,
                message: question.message,
                tags: question.tags
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

const deleteQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { questionId } = req.body;

    const question = await Post.findById(questionId);

    if (question === null) {
        res.status(404).json({ message: "Question not found" })
        return
    }

    if (question.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" })
        return
    }

    try {
        await Post.deleteAndCleanup({ _id: questionId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
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

        const attachments = await PostAttachment.getByPostId(reply._id.toString())

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

    const question = await Post.findById(reply.parentId);
    if (question === null) {
        res.status(404).json({ message: "Question not found" })
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

const votePost = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const emailVerified = req.emailVerified;
    const { postId, vote } = req.body;

    if (typeof vote === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if (!emailVerified) {
        res.status(401).json({ message: "Activate your account" })
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

const getCodeComments = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { codeId, parentId, index, count, filter, findPostId } = req.body;

    if (typeof filter === "undefined" || typeof index === "undefined" || typeof count === "undefined") {
        res.status(400).json({ message: "Some fileds are missing" });
        return
    }

    let parentPost: any = null;
    if (parentId) {
        parentPost = await Post
            .findById(parentId)
            .populate("user", "name avatarUrl countryCode level roles");
    }

    let dbQuery = Post.find({ codeId, _type: 3 });

    let skipCount = index;

    if (findPostId) {

        const reply = await Post.findById(findPostId);

        if (reply === null) {
            res.status(404).json({ message: "Post not found" })
            return
        }

        parentPost = reply.parentId ? await Post
            .findById(reply.parentId)
            .populate("user", "name avatarUrl countryCode level roles")
            :
            null;

        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null })

        skipCount = Math.max(0, (await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()));

        dbQuery = dbQuery
            .sort({ createdAt: "asc" })
    }
    else {
        dbQuery = dbQuery.where({ parentId });

        switch (filter) {
            // Most popular
            case 1: {
                dbQuery = dbQuery
                    .sort({ votes: "desc", createdAt: "desc" })
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
                throw new Error("Unknown filter");
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles") as any[];

    if (result) {
        const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
            id: x._id,
            parentId: x.parentId,
            codeId: x.codeId,
            message: x.message,
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles,
            votes: x.votes,
            isUpvoted: false,
            isAccepted: x.isAccepted,
            answers: x.answers,
            index: (findPostId && parentPost) ?
                offset === 0 ? -1 : skipCount + offset - 1 :
                skipCount + offset,
            attachments: new Array()
        }))

        let promises = [];

        for (let i = 0; i < data.length; ++i) {
            /*promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].votes = count;
            }));*/
            if (currentUserId) {
                promises.push(Upvote.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                    data[i].isUpvoted = !(upvote === null);
                }));
            }
            promises.push(PostAttachment.getByPostId(data[i].id).then(attachments => data[i].attachments = attachments));
        }

        await Promise.all(promises);

        res.status(200).json({ posts: data })
    }
    else {
        res.status(500).json({ message: "Error" });
    }
});

const createCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const emailVerified = req.emailVerified;
    const { codeId, message, parentId } = req.body;

    if (!emailVerified) {
        res.status(401).json({ message: "Activate your account" });
        return
    }

    const code = await Code.findById(codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" });
        return
    }

    let parentPost = null;
    if (parentId !== null) {
        parentPost = await Post.findById(parentId);
        if (parentPost === null) {
            res.status(404).json({ message: "Parent post not found" });
            return
        }
    }

    const reply = await Post.create({
        _type: 3,
        message,
        codeId,
        parentId,
        user: currentUserId
    })

    if (reply) {

        const usersToNotify = new Set();
        usersToNotify.add(code.user.toString())
        if (parentPost !== null) {
            usersToNotify.add(parentPost.user.toString())
        }
        usersToNotify.delete(currentUserId)

        for (let userToNotify of usersToNotify) {

            await Notification.create({
                _type: 202,
                user: userToNotify,
                actionUser: currentUserId,
                message: userToNotify === code.user.toString() ?
                    `{action_user} posted comment on your code "${code.name}"`
                    :
                    `{action_user} replied to your comment on "${code.name}"`,
                codeId: code._id,
                postId: reply._id
            })
        }

        code.$inc("comments", 1)
        await code.save();

        if (parentPost) {
            parentPost.$inc("answers", 1)
            await parentPost.save();
        }

        res.json({
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                userId: reply.user,
                codeId: reply.codeId,
                parentId: reply.parentId,
                isAccepted: reply.isAccepted,
                votes: reply.votes,
                answers: reply.answers
            }
        })
    }
    else {
        res.status(500).json({ message: "error" });
    }
});

const editCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { commentId, message } = req.body;

    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" })
        return
    }

    console.log("editCodeComment");

    const comment = await Post.findById(commentId);

    if (comment === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    comment.message = message;

    try {
        await comment.save();

        res.json({
            success: true,
            data: {
                id: comment._id,
                message: comment.message
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

const deleteCodeComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { commentId } = req.body;

    const comment = await Post.findById(commentId);

    if (comment === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    const code = await Code.findById(comment.codeId);
    if (code === null) {
        res.status(404).json({ message: "Code not found" })
        return
    }

    try {

        await Post.deleteAndCleanup({ _id: commentId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

const followQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
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
        res.status(405).json({ message: "Post is not a question" });
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

const unfollowQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
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
        res.status(405).json({ message: "Post is not a question" });
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

const discussController = {
    createQuestion,
    getQuestionList,
    getQuestion,
    createReply,
    getReplies,
    getTags,
    toggleAcceptedAnswer,
    editQuestion,
    deleteQuestion,
    editReply,
    deleteReply,
    votePost,
    createCodeComment,
    getCodeComments,
    editCodeComment,
    deleteCodeComment,
    followQuestion,
    unfollowQuestion
}

export default discussController;