import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import Course, { ICourseDocument } from "../models/Course";
import CourseProgress, { ICourseProgressDocument } from "../models/CourseProgress";
import CourseLesson from "../models/CourseLesson";
import LessonNode from "../models/LessonNode";
import QuizAnswer from "../models/QuizAnswer";
import User from "../models/User";
import RolesEnum from "../data/RolesEnum";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import Post from "../models/Post";
import PostAttachment from "../models/PostAttachment";
import Notification from "../models/Notification";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import PostTypeEnum from "../data/PostTypeEnum";
import Upvote from "../models/Upvote";
import mongoose, { Types } from "mongoose";
import {
    getCourseListSchema,
    getUserCourseListSchema,
    getCourseSchema,
    getLessonSchema,
    getLessonNodeSchema,
    solveSchema,
    resetCourseProgressSchema,
    getLessonCommentsSchema,
    createLessonCommentSchema,
    editLessonCommentSchema,
    deleteLessonCommentSchema
} from "../validation/courseSchema";
import { parseWithZod } from "../utils/zodUtils";

const getCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCourseListSchema, req);
    const { excludeUserId } = body;

    let result;
    if (excludeUserId) {
        const progresses = await CourseProgress.find({ userId: excludeUserId }).select("course");
        const startedCourseIds = progresses.map(x => x.course);
        result = await Course.find({
            visible: true,
            _id: { $nin: startedCourseIds }
        });
    } else {
        result = await Course.find({ visible: true });
    }

    const data = result.map(course => ({
        id: course._id,
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        coverImage: course.coverImage
    }));

    res.json({
        success: true,
        courses: data
    });
});

const getUserCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUserCourseListSchema, req);
    const { userId } = body;

    const result = await CourseProgress.find({ userId }).populate<{ course: ICourseDocument }>("course");

    const data = result.map(x => ({
        id: x.course._id,
        code: x.course.code,
        title: x.course.title,
        description: x.course.description,
        visible: x.course.visible,
        coverImage: x.course.coverImage,
        completed: x.completed,
        updatedAt: x.updatedAt
    }));

    res.json({
        success: true,
        courses: data
    });
});

const getCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCourseSchema, req);
    const { courseId, courseCode, includeLessons } = body;
    const currentUserId = req.userId;

    let course = null;
    if (courseId) {
        course = await Course.findById(courseId);
    } else {
        course = await Course.findOne({ code: courseCode });
    }

    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    let userProgress = await CourseProgress.findOne({ course: course.id, userId: currentUserId });
    if (!userProgress) {
        userProgress = await CourseProgress.create({ course: course.id, userId: currentUserId });
    }

    let lessons: any[] = [];
    if (includeLessons === true) {
        lessons = await CourseLesson.find({ course: course.id }).sort({ index: "asc" });

        const lastUnlockedLessonIndex = await userProgress.getLastUnlockedLessonIndex();

        let lastUnlockedNodeIndex = 1;
        if (userProgress.lastLessonNodeId) {
            const lastLessonNode = await LessonNode.findById(userProgress.lastLessonNodeId).select("index");
            if (lastLessonNode) {
                lastUnlockedNodeIndex = lastLessonNode.index + 1;
            }
        }

        lessons = lessons.map(lesson => ({
            id: lesson._id,
            title: lesson.title,
            index: lesson.index,
            nodeCount: lesson.nodes,
            unlocked: lesson.index <= lastUnlockedLessonIndex,
            completed: lesson.index < lastUnlockedLessonIndex,
            lastUnlockedNodexIndex: lesson.index < lastUnlockedLessonIndex ? lesson.nodes : lastUnlockedNodeIndex
        }));
    }

    res.json({
        success: true,
        course: {
            id: course._id,
            code: course.code,
            title: course.title,
            description: course.description,
            visible: course.visible,
            coverImage: course.coverImage,
            lessons,
            userProgress: {
                updatedAt: userProgress.updatedAt,
                nodesSolved: userProgress.nodesSolved,
                completed: userProgress.completed
            }
        }
    });
});

const getLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonSchema, req);
    const { lessonId } = body;
    const currentUserId = req.userId;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    const userProgress = await CourseProgress.findOne({ course: lesson.course, userId: currentUserId }).populate("lastLessonNodeId", "index lessonId") as any;
    if (!userProgress) {
        res.status(404).json({ error: [{ message: "User progress not found" }] });
        return;
    }

    const lastUnlockedLessonIndex = await userProgress.getLastUnlockedLessonIndex();
    if (lesson.index > lastUnlockedLessonIndex) {
        res.status(400).json({ error: [{ message: "Lesson is not unlocked" }] });
        return;
    }

    const data: any = {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes,
        comments: lesson.comments
    };

    let lastUnlockedNodeIndex = 1;
    if (lesson._id.equals(userProgress.lastLessonNodeId?.lessonId)) {
        lastUnlockedNodeIndex = userProgress.lastLessonNodeId.index + 1;
    }

    const nodes = await LessonNode.find({ lessonId: lesson._id }).sort({ index: "asc" }).select("_id _type index");
    data.nodes = nodes.map(x => ({
        id: x._id,
        index: x.index,
        type: x._type,
        unlocked: lesson.index < lastUnlockedLessonIndex || x.index <= lastUnlockedNodeIndex
    }));

    res.json({
        success: true,
        lesson: data
    });
});

const getLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonNodeSchema, req);
    const { nodeId, mock } = body;
    const currentUserId = req.userId;

    const lessonNode = await LessonNode.findById(nodeId).populate([
        { path: "lessonId" },
        { path: "codeId", select: "name source cssSource jsSource language" }
    ]);
    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    if (!mock) {
        const userProgress = await CourseProgress.findOne({ course: (lessonNode.lessonId as any).course, userId: currentUserId });
        if (!userProgress) {
            res.status(404).json({ error: [{ message: "User progress not found" }] });
            return;
        }

        const { unlocked, isLastUnlocked } = await userProgress.getLessonNodeInfo(lessonNode._id.toString());
        if (!unlocked) {
            res.status(400).json({ error: [{ message: "Node is not unlocked" }] });
            return;
        }

        if (lessonNode._type === LessonNodeTypeEnum.TEXT && isLastUnlocked) {
            userProgress.$inc("nodesSolved", 1);
            userProgress.lastLessonNodeId = lessonNode._id as any;
            await userProgress.save();
        }
    } else {
        const user = await User.findById(currentUserId).select("roles");
        if (!user || ![RolesEnum.CREATOR, RolesEnum.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ error: [{ message: "Unauthorized" }] });
            return;
        }
    }

    const answers = await QuizAnswer.find({ courseLessonNodeId: lessonNode._id });

    res.json({
        success: true,
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type,
            mode: lessonNode.mode,
            codeId: lessonNode.codeId,
            text: lessonNode.text ?? "",
            correctAnswer: lessonNode.correctAnswer,
            answers: answers.map(x => ({
                id: x._id,
                text: x.text,
                correct: x.correct
            }))
        }
    });
});

const solve = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(solveSchema, req);
    const { nodeId, correctAnswer, answers, mock } = body;
    const currentUserId = req.userId;

    const lessonNode = await LessonNode.findById(nodeId)
        .populate<{ lessonId: { course: mongoose.Types.ObjectId } }>("lessonId", "course");
    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    let userProgress: ICourseProgressDocument | null = null;
    let isLast = false;
    if (!mock) {
        userProgress = await CourseProgress.findOne({ course: lessonNode.lessonId.course, userId: currentUserId });
        if (!userProgress) {
            res.status(404).json({ error: [{ message: "User progress not found" }] });
            return;
        }

        const nodeInfo = await userProgress.getLessonNodeInfo(lessonNode.id);
        if (!nodeInfo.unlocked) {
            res.status(400).json({ error: [{ message: "Node is not unlocked" }] });
            return;
        }
        isLast = nodeInfo.isLastUnlocked;
    } else {
        const user = await User.findById(currentUserId).select("roles");
        if (!user || ![RolesEnum.CREATOR, RolesEnum.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ error: [{ message: "Unauthorized" }] });
            return;
        }
    }

    const nodeAnswers = await QuizAnswer.find({ courseLessonNodeId: lessonNode.id }).select("correct");

    let correct = false;
    switch (mock?.type ? mock.type : lessonNode._type) {
        case LessonNodeTypeEnum.TEXT:
            correct = true;
            break;
        case LessonNodeTypeEnum.SINGLECHOICE_QUESTION:
        case LessonNodeTypeEnum.MULTICHOICE_QUESTION:
            correct = ((mock?.answers ? mock.answers : nodeAnswers) as { id: string, correct: boolean }[]).every((x) => {
                const myAnswer = answers?.find((y: any) => y.id.toString() === x.id);
                return myAnswer && myAnswer.correct === x.correct;
            });
            break;
        case LessonNodeTypeEnum.TEXT_QUESTION:
            correct = correctAnswer === (mock?.correctAnswer ? mock.correctAnswer : lessonNode.correctAnswer);
            break;
    }

    if (!mock && isLast && correct) {
        userProgress!.lastLessonNodeId = lessonNode.id;
        userProgress!.$inc("nodesSolved", 1);
        await userProgress!.save();
    }

    res.json({
        success: true,
        data: { correct }
    });
});

const resetCourseProgress = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(resetCourseProgressSchema, req);
    const { courseId } = body;
    const currentUserId = req.userId;

    const userProgress = await CourseProgress.findOne({ course: courseId, userId: currentUserId });
    if (!userProgress) {
        res.status(404).json({ error: [{ message: "Course progress not found" }] });
        return;
    }

    userProgress.lastLessonNodeId = null as any;
    userProgress.nodesSolved = 0;
    userProgress.completed = false;
    await userProgress.save();

    res.json({ success: true });
});

const getLessonComments = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonCommentsSchema, req);
    const { lessonId, parentId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    let parentPost: any = null;
    if (parentId) {
        parentPost = await Post
            .findById(parentId)
            .populate("user", "name avatarImage countryCode level roles");
    }

    let dbQuery = Post.find({ lessonId, _type: PostTypeEnum.LESSON_COMMENT, hidden: false });

    let skipCount = index;

    if (findPostId) {
        const reply = await Post.findById(findPostId);
        if (!reply) {
            res.status(404).json({ error: [{ message: "Post not found" }] });
            return;
        }

        parentPost = reply.parentId ? await Post
            .findById(reply.parentId)
            .populate("user", "name avatarImage countryCode level roles")
            : null;

        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });

        skipCount = Math.max(0, (await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()));
    } else {
        dbQuery = dbQuery.where({ parentId });

        switch (filter) {
            case 1: // Most popular
                dbQuery = dbQuery.sort({ votes: "desc", createdAt: "desc" });
                break;
            case 2: // Oldest first
                dbQuery = dbQuery.sort({ createdAt: "asc" });
                break;
            case 3: // Newest first
                dbQuery = dbQuery.sort({ createdAt: "desc" });
                break;
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles") as any[];

    const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
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
        answers: x.answers,
        index: (findPostId && parentPost) ? (offset === 0 ? -1 : skipCount + offset - 1) : skipCount + offset,
        attachments: new Array()
    }));

    const promises = data.map((item, i) => [
        Upvote.findOne({ parentId: item.id, user: currentUserId }).then(upvote => {
            data[i].isUpvoted = !!upvote;
        }),
        PostAttachment.getByPostId({ post: item.id }).then(attachments => {
            data[i].attachments = attachments;
        })
    ]).flat();

    await Promise.all(promises);

    res.json({ success: true, posts: data });
});

const createLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createLessonCommentSchema, req);
    const { lessonId, message, parentId } = body;
    const currentUserId = req.userId;

    const lesson = await CourseLesson.findById(lessonId)
        .populate<{ course: any }>("course", "code title");
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    let parentPost = null;
    if (parentId) {
        parentPost = await Post.findById(parentId);
        if (!parentPost) {
            res.status(404).json({ error: [{ message: "Parent post not found" }] });
            return;
        }
    }

    const reply = await Post.create({
        _type: PostTypeEnum.LESSON_COMMENT,
        message,
        lessonId,
        parentId,
        user: currentUserId
    });

    if (parentPost && parentPost.user != currentUserId) {
        await Notification.sendToUsers([parentPost.user as Types.ObjectId], {
            title: "New reply",
            type: NotificationTypeEnum.LESSON_COMMENT,
            actionUser: currentUserId!,
            message: `{action_user} replied to your comment on lesson "${lesson.title}" to ${lesson.course.title}`,
            lessonId: lesson._id,
            postId: reply._id,
            courseCode: lesson.course.code
        });
    }

    lesson.$inc("comments", 1);
    await lesson.save();

    if (parentPost) {
        parentPost.$inc("answers", 1);
        await parentPost.save();
    }

    const attachments = await PostAttachment.getByPostId({ post: reply._id });

    res.json({
        success: true,
        post: {
            id: reply._id,
            message: reply.message,
            date: reply.createdAt,
            userId: reply.user,
            parentId: reply.parentId,
            votes: reply.votes,
            answers: reply.answers,
            attachments
        }
    });
});

const editLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editLessonCommentSchema, req);
    const { id, message } = body;
    const currentUserId = req.userId;

    const comment = await Post.findById(id);
    if (!comment) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (comment.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    comment.message = message;

    await comment.save();
    const attachments = await PostAttachment.getByPostId({ post: comment._id });
    res.json({
        success: true,
        data: {
            id: comment._id,
            message: comment.message,
            attachments
        }
    });
});

const deleteLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteLessonCommentSchema, req);
    const { id } = body;
    const currentUserId = req.userId;

    const comment = await Post.findById(id);
    if (!comment) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (comment.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const lesson = await CourseLesson.findById(comment.lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    await Post.deleteAndCleanup({ _id: id });
    res.json({ success: true });
});

const courseController = {
    getCourseList,
    getUserCourseList,
    getCourse,
    getLesson,
    getLessonNode,
    solve,
    resetCourseProgress,
    getLessonComments,
    createLessonComment,
    editLessonComment,
    deleteLessonComment
};

export default courseController;