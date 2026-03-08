import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import PostModel, { Post } from "../models/Post";
import TagModel, { Tag } from "../models/Tag";
import UpvoteModel from "../models/Upvote";
import PostFollowing from "../models/PostFollowing";
import mongoose, { Types } from "mongoose";
import { escapeRegex } from "../utils/regexUtils";
import UserFollowing from "../models/UserFollowing";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import PostTypeEnum from "../data/PostTypeEnum";
import { parseWithZod } from "../utils/zodUtils";
import { createQuestionSchema, createReplySchema, deleteQuestionSchema, deleteReplySchema, editQuestionSchema, editReplySchema, followQuestionSchema, getQuestionListSchema, getQuestionSchema, getRepliesSchema, getVotersListSchema, toggleAcceptedAnswerSchema, unfollowQuestionSchema, votePostSchema } from "../validation/discussionSchema";
import RolesEnum from "../data/RolesEnum";
import { isAuthorizedRole } from "../utils/modelUtils";
import { getImageUrl } from "./mediaController";
import { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { deletePostsAndCleanup, getAttachmentsByPostId } from "../helpers/postsHelper";
import { formatUserMinimal } from "../helpers/userHelper";
import { sendNotifications } from "../helpers/notificationHelper";
import { getOrCreateTagsByNames } from "../helpers/tagsHelper";

const createQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createQuestionSchema, req);
    const { title, message, tags } = body;
    const currentUserId = req.userId;

    const tagIds: Types.ObjectId[] = [];

    for (const tagName of tags) {
        const tag = await TagModel.findOne({ name: tagName }).lean();
        if (tag) {
            tagIds.push(tag._id);
        }
    }

    const question = await PostModel.create({
        _type: PostTypeEnum.QUESTION,
        title,
        message,
        tags: tagIds,
        user: currentUserId
    });

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

    let dbQuery = PostModel.find({ _type: PostTypeEnum.QUESTION, hidden: false });

    if (searchQuery && searchQuery.trim().length > 0) {
        const safeQuery = escapeRegex(searchQuery.trim());
        const searchRegex = new RegExp(`(^|\\b)${safeQuery}`, "i");
        const tagIds = (await TagModel.find({ name: searchQuery.trim() }).lean()).map(x => x._id);
        dbQuery.where({
            $or: [
                { title: searchRegex },
                { tags: { $in: tagIds } }
            ]
        });
    }

    switch (filter) {
        case 1: {
            dbQuery = dbQuery.sort({ createdAt: "desc" });
            break;
        }
        case 2: {
            dbQuery = dbQuery.where({ answers: 0 }).sort({ createdAt: "desc" });
            break;
        }
        case 3: {
            if (!userId) {
                res.status(400).json({ error: [{ message: "Invalid request" }] });
                return;
            }
            dbQuery = dbQuery.where({ user: userId }).sort({ createdAt: "desc" });
            break;
        }
        case 4: {
            if (!userId) {
                res.status(400).json({ error: [{ message: "Invalid request" }] });
                return;
            }
            const replies = await PostModel.find({ user: userId, _type: PostTypeEnum.ANSWER }).select("parentId").lean();
            const questionIds = [...new Set(replies.map(x => x.parentId))];
            dbQuery = dbQuery.where({ _id: { $in: questionIds } }).sort({ createdAt: "desc" });
            break;
        }
        case 5: {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            dbQuery = dbQuery.where({ createdAt: { $gt: dayAgo } }).sort({ votes: "desc" });
            break;
        }
        case 6: {
            dbQuery = dbQuery.sort({ votes: "desc" });
            break;
        }
        default:
            res.status(400).json({ error: [{ message: "Unknown filter" }] });
            return;
    }

    const [questionCount, questions] = await Promise.all([
        dbQuery.clone().countDocuments(),
        dbQuery
            .clone()
            .skip((page - 1) * count)
            .limit(count)
            .select({ message: 0 })
            .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
            .populate<{ tags: Tag[] }>("tags")
            .lean()
    ]);

    const data = questions.map(x => ({
        id: x._id,
        title: x.title,
        tags: x.tags.map((tag: Tag) => tag.name),
        date: x.createdAt,
        user: formatUserMinimal(x.user),
        answers: x.answers,
        votes: x.votes,
        isUpvoted: false,
        isAccepted: x.isAccepted,
    }));

    if (currentUserId) {
        await Promise.all(data.map((item, i) =>
            UpvoteModel.findOne({ parentId: data[i].id, user: currentUserId }).lean().then(upvote => {
                data[i].isUpvoted = upvote !== null;
            })
        ));
    }

    res.status(200).json({ count: questionCount, questions: data });
});

const getQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getQuestionSchema, req);
    const { questionId } = body;
    const currentUserId = req.userId;

    const question = await PostModel.findById(questionId)
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
        .populate<{ tags: Tag[] }>("tags")
        .lean();

    if (!question) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    const [isUpvoted, isFollowed, attachments] = await Promise.all([
        currentUserId ? UpvoteModel.exists({ parentId: questionId, user: currentUserId }).then(r => r !== null) : false,
        currentUserId ? PostFollowing.exists({ user: currentUserId, following: questionId }).then(r => r !== null) : false,
        getAttachmentsByPostId({ post: questionId })
    ]);

    res.json({
        question: {
            id: question._id,
            title: question.title,
            message: question.message,
            tags: question.tags.map(tag => tag.name),
            date: question.createdAt,
            user: formatUserMinimal(question.user),
            answers: question.answers,
            votes: question.votes,
            isUpvoted,
            isAccepted: question.isAccepted,
            isFollowed,
            attachments
        }
    });
});

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createReplySchema, req);
    const { message, questionId } = body;
    const currentUserId = req.userId;

    const question = await PostModel.findById(questionId);
    if (!question) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    const reply = await PostModel.create({
        _type: PostTypeEnum.ANSWER,
        message,
        parentId: questionId,
        user: currentUserId
    });

    const questionFollowed = await PostFollowing.exists({ user: currentUserId, following: question._id });
    if (!questionFollowed) {
        await PostFollowing.create({ user: currentUserId, following: question._id });
    }

    const followers = await PostFollowing.find({ following: question._id }).lean();
    await sendNotifications({
        title: "New answer",
        type: NotificationTypeEnum.QA_ANSWER,
        actionUser: new Types.ObjectId(currentUserId),
        message: `{action_user} posted in "${question.title}"`,
        questionId: question._id,
        postId: reply._id
    }, followers.filter(x => !x.user.equals(currentUserId)).map(x => x.user));

    if (!question.user.equals(currentUserId)) {
        await sendNotifications({
            title: "New answer",
            type: NotificationTypeEnum.QA_ANSWER,
            actionUser: new Types.ObjectId(currentUserId),
            message: `{action_user} answered your question "${question.title}"`,
            questionId: question._id,
            postId: reply._id
        }, [question.user]);
    }

    question.$inc("answers", 1);
    await question.save();

    const attachments = await getAttachmentsByPostId({ post: reply._id });

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
    });
});

const getReplies = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getRepliesSchema, req);
    const { questionId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    let dbQuery = PostModel.find({ parentId: questionId, _type: PostTypeEnum.ANSWER, hidden: false });
    let skipCount = index;

    if (findPostId) {
        const reply = await PostModel.findById(findPostId).lean();
        if (!reply) {
            res.status(404).json({ error: [{ message: "Post not found" }] });
            return;
        }
        skipCount = Math.floor((await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()) / count) * count;
        dbQuery = dbQuery.sort({ createdAt: "asc" });
    } else {
        switch (filter) {
            case 1: dbQuery = dbQuery.sort({ votes: "desc" }); break;
            case 2: dbQuery = dbQuery.sort({ createdAt: "asc" }); break;
            case 3: dbQuery = dbQuery.sort({ createdAt: "desc" }); break;
            default:
                res.status(400).json({ error: [{ message: "Unknown filter" }] });
                return;
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
        .lean();

    const data = result.map((x, offset) => ({
        id: x._id,
        parentId: x.parentId,
        message: x.message,
        date: x.createdAt,
        user: formatUserMinimal(x.user),
        votes: x.votes,
        isUpvoted: false,
        isAccepted: x.isAccepted,
        answers: x.answers,
        index: skipCount + offset,
        attachments: [] as Awaited<ReturnType<typeof getAttachmentsByPostId>>
    }));

    await Promise.all(data.map((item, i) => Promise.all([
        currentUserId
            ? UpvoteModel.findOne({ parentId: item.id, user: currentUserId }).lean().then(upvote => { data[i].isUpvoted = upvote !== null; })
            : Promise.resolve(),
        getAttachmentsByPostId({ post: item.id }).then(attachments => { data[i].attachments = attachments; })
    ])));

    res.status(200).json({ posts: data });
});

const toggleAcceptedAnswer = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(toggleAcceptedAnswerSchema, req);
    const { accepted, postId } = body;
    const currentUserId = req.userId;

    const post = await PostModel.findById(postId);
    if (!post) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    const question = await PostModel.findById(post.parentId);
    if (!question) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    if (!question.user.equals(currentUserId)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    if (accepted || post.isAccepted) {
        question.isAccepted = accepted;
        await question.save();
    }

    post.isAccepted = accepted;
    await post.save();

    if (accepted) {
        const currentAcceptedPost = await PostModel.findOne({ parentId: post.parentId, isAccepted: true, _id: { $ne: postId } });
        if (currentAcceptedPost) {
            currentAcceptedPost.isAccepted = false;
            await currentAcceptedPost.save();
        }
    }

    res.json({ success: true, accepted });
});

const editQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editQuestionSchema, req);
    const { questionId, title, message, tags } = body;
    const currentUserId = req.userId;

    const question = await PostModel.findById(questionId);
    if (!question) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    if (!question.user.equals(currentUserId)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const tagIds = (await getOrCreateTagsByNames(tags)).map(x => x._id);

    question.title = title;
    question.message = message;
    question.tags = tagIds;

    await question.save();

    const attachments = await getAttachmentsByPostId({ post: question._id });

    res.json({
        success: true,
        data: {
            id: question._id,
            title: question.title,
            message: question.message,
            tags: question.tags,
            attachments
        }
    });
});

const deleteQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteQuestionSchema, req);
    const { questionId } = body;
    const currentUserId = req.userId;

    const question = await PostModel.findById(questionId).lean();
    if (!question) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    if (!question.user.equals(currentUserId) && !isAuthorizedRole(req, [RolesEnum.ADMIN, RolesEnum.MODERATOR])) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    await deletePostsAndCleanup({ _id: questionId });

    res.json({ success: true });
});

const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editReplySchema, req);
    const { replyId, message } = body;
    const currentUserId = req.userId;

    const reply = await PostModel.findById(replyId);
    if (!reply) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (!reply.user.equals(currentUserId)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    reply.message = message;
    await reply.save();

    const attachments = await getAttachmentsByPostId({ post: reply._id });

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

    const reply = await PostModel.findById(replyId).lean();
    if (!reply) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (!reply.user.equals(currentUserId) && !isAuthorizedRole(req, [RolesEnum.ADMIN, RolesEnum.MODERATOR])) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const question = await PostModel.findById(reply.parentId).lean();
    if (!question) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    await deletePostsAndCleanup({ _id: replyId });

    res.json({ success: true });
});

const votePost = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(votePostSchema, req);
    const { postId, vote } = body;
    const currentUserId = req.userId;

    const post = await PostModel.findById(postId);
    if (!post) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    let upvote = await UpvoteModel.findOne({ parentId: postId, user: currentUserId });
    if (vote === 1) {
        if (!upvote) {
            upvote = await UpvoteModel.create({ user: currentUserId, parentId: postId });
            post.$inc("votes", 1);
            await post.save();
        }
    } else if (vote === 0) {
        if (upvote) {
            await UpvoteModel.deleteOne({ _id: upvote._id });
            upvote = null;
            post.$inc("votes", -1);
            await post.save();
        }
    }

    res.json({ success: true, vote: upvote ? 1 : 0 });
});

const followQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(followQuestionSchema, req);
    const { postId } = body;
    const currentUserId = req.userId;

    const postExists = await PostModel.exists({ _id: postId, _type: PostTypeEnum.QUESTION });
    if (!postExists) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    const exists = await PostFollowing.exists({ user: currentUserId, following: postId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }

    await PostFollowing.create({ user: currentUserId, following: postId });

    res.json({ success: true });
});

const unfollowQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(unfollowQuestionSchema, req);
    const { postId } = body;
    const currentUserId = req.userId;

    const postExists = await PostModel.exists({ _id: postId, _type: PostTypeEnum.QUESTION });
    if (!postExists) {
        res.status(404).json({ error: [{ message: "Question not found" }] });
        return;
    }

    const postFollowing = await PostFollowing.exists({ user: currentUserId, following: postId });
    if (!postFollowing) {
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

    const result = await UpvoteModel.find({ parentId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
        .select("user")
        .lean();

    const data = result.map(x => ({
        id: x.user._id,
        name: x.user.name,
        avatarUrl: getImageUrl(x.user.avatarHash),
        countryCode: x.user.countryCode,
        level: x.user.level,
        roles: x.user.roles,
        isFollowing: false
    }));

    await Promise.all(data.map((user, i) =>
        UserFollowing.exists({ user: currentUserId, following: user.id }).then(exists => {
            data[i].isFollowing = exists !== null;
        })
    ));

    res.json({ success: true, data });
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
};

export default discussController;