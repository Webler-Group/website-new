import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import Question from "../models/Question";
import Reply from "../models/Reply";
import Tag from "../models/Tag";
import Upvote from "../models/Upvote";

const createQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { title, message, tags } = req.body;
    const currentUserId = req.userId;

    if (typeof title === "undefined" || typeof message === "undefined" || typeof tags === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
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

    const question = await Question.create({
        title,
        message,
        tags: tagIds,
        user: currentUserId
    })

    if (question) {
        res.json({
            question: {
                id: question._id,
                title: question.title,
                message: question.message,
                tags: question.tags,
                date: question.createdAt,
                userId: question.user
            }
        });
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});

const getQuestionList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const query = req.query;
    const currentUserId = req.userId;

    const page = Number(query.page);
    const count = Number(query.count);
    const filter = Number(query.filter);
    const searchQuery = typeof query.query !== "string" ? "" : query.query.trim();
    const userId = typeof query.profileId !== "string" ? null : query.profileId;

    if (!Number.isInteger(page) || !Number.isInteger(count) || !Number.isInteger(filter)) {
        res.status(400).json({ message: "Invalid query params" });
        return
    }

    let dbQuery = Question.find()

    if (searchQuery.length) {
        const tagIds = (await Tag.find({ name: searchQuery }))
            .map(x => x._id);
        dbQuery.where({
            $or: [
                { title: new RegExp("^" + searchQuery, "i") },
                { "tags": { $in: tagIds } }
            ]
        })
    }

    switch (filter) {
        // Most Recent
        case 1: {
            dbQuery = dbQuery
                .sort({ createdAt: "desc" })
            break;
        }
        // My Questions
        case 2: {
            if (userId === null) {
                res.status(400).json({ message: "Invalid query params" });
                return
            }
            dbQuery = dbQuery
                .where("user").equals(userId)
                .sort({ createdAt: "desc" })
            break;
        }
        default:
            throw new Error("Unknown filter");
    }

    const questionCount = await dbQuery.clone().countDocuments();

    const result = await dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("tags", "name") as any[];

    if (result) {
        const data = result.map(x => ({
            id: x._id,
            title: x.title,
            message: x.message,
            tags: x.tags.map((y: any) => y.name),
            date: x.createdAt,
            userId: x.user._id,
            userName: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles,
            answers: 0,
            upvotes: 0
        }));

        let promises = [];

        for (let i = 0; i < data.length; ++i) {
            promises.push(Reply.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].answers = count;
            }));
            promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].upvotes = count;
            }));
        }

        await Promise.all(promises);

        res.json({ count: questionCount, questions: data });
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});

const getQuestion = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const questionId = req.params.questionId;

    const question = await Question.findById(questionId)
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("tags", "name") as any;

    if (question) {

        const answers = await Reply.countDocuments({ parentId: questionId });
        const upvotes = await Upvote.countDocuments({ parentId: questionId });

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
                answers,
                upvotes
            }
        });
    }
    else {
        res.status(404).json({ message: "Question not found" })
    }
});

const createReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { message, questionId } = req.body;

    const reply = await Reply.create({
        message,
        parentId: questionId,
        user: currentUserId
    })

    if (reply) {
        res.json({
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                userId: reply.user,
                parentId: reply.parentId,
                isAccepted: reply.isAccepted
            }
        })
    }
    else {
        res.status(500).json({ message: "error" });
    }
});

const getReplies = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const query = req.query;
    const questionId = req.params.questionId;

    const page = Number(query.page);
    const count = Number(query.count);
    const filter = Number(query.filter);

    if (!Number.isInteger(page) || !Number.isInteger(count) || !Number.isInteger(filter)) {
        res.status(400).json({ message: "Invalid query params" });
        return
    }

    let dbQuery = Reply.find({ parentId: questionId });

    switch (filter) {
        // Oldest first
        case 1: {
            dbQuery = dbQuery
                .sort({ createdAt: "asc" })
            break;
        }
        default:
            throw new Error("Unknown filter");
    }

    const result = await dbQuery
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles") as any[];

    if (result) {
        const data = result.map(x => ({
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
            upvotes: 0,
            isAccepted: x.isAccepted
        }))

        let promises = [];

        for (let i = 0; i < data.length; ++i) {
            promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
                data[i].upvotes = count;
            }));
        }

        await Promise.all(promises);

        res.json({ posts: data })
    }
    else {
        res.status(500).json({ message: "Error" });
    }

});

const getTags = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { query } = req.query;

    if (typeof query !== "string") {
        res.status(400).json({ message: "Invalid query params" });
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

    const post = await Reply.findById(postId);

    if (post === null) {
        res.status(404).json({ success: false, message: "Post not found" })
        return
    }

    post.isAccepted = accepted;

    await post.save();

    if (accepted) {
        const prevAccepted = await Reply.findOne({ parentId: post.parentId, isAccepted: true, _id: { $ne: postId } });
        if (prevAccepted) {
            prevAccepted.isAccepted = false;

            await prevAccepted.save();
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

    const question = await Question.findById(questionId);

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

    const question = await Question.findById(questionId);

    if (question === null) {
        res.status(404).json({ message: "Question not found" })
        return
    }

    if (question.user != currentUserId) {
        res.status(401).json({ message: "Unauthorized" })
        return
    }

    try {
        await Question.deleteOne({ _id: questionId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

const editReply = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { replyId, message } = req.body;

    console.log(replyId, message);


    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" })
        return
    }

    const reply = await Reply.findById(replyId);

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

        res.json({
            success: true,
            data: {
                id: reply._id,
                message: reply.message
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

    const reply = await Reply.findById(replyId);

    if (reply === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != reply.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    try {
        await Reply.deleteOne({ _id: replyId });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

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
    deleteReply
}

export default discussController;