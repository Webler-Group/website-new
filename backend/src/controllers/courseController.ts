import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import CourseModel, { Course } from "../models/Course";
import CourseProgressModel, { CourseProgress } from "../models/CourseProgress";
import CourseLessonModel, { CourseLesson } from "../models/CourseLesson";
import LessonNodeModel from "../models/LessonNode";
import QuizAnswer from "../models/QuizAnswer";
import User, { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import RolesEnum from "../data/RolesEnum";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import PostModel, { Post } from "../models/Post";
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
import { getImageUrl } from "./mediaController";
import { DocumentType } from "@typegoose/typegoose";
import { CourseResponse, formatLesson, formatLessonNodeMinimal, getLastUnlockedLessonIndex, getLessonNodeInfo, LessonResponse } from "../helpers/courseHelper";
import { CODE_MINIMAL_FIELDS } from "../models/Code";
import { formatUserMinimal } from "../helpers/userHelper";
import { deletePostsAndCleanup, getAttachmentsByPostId } from "../helpers/postsHelper";
import { sendNotifications } from "../helpers/notificationHelper";

const getCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCourseListSchema, req);
    const { excludeUserId } = body;

    let result;
    if (excludeUserId) {
        const progresses = await CourseProgressModel.find({ userId: excludeUserId }, { course: 1 }).lean();
        const startedCourseIds = progresses.map(x => x.course);
        result = await CourseModel.find({
            visible: true,
            _id: { $nin: startedCourseIds }
        }).lean();
    } else {
        result = await CourseModel.find({ visible: true }).lean();
    }

    const data = result.map(course => ({
        id: course._id,
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        coverImageUrl: getImageUrl(course.coverImageHash)
    }));

    res.json({
        success: true,
        courses: data
    });
});

const getUserCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUserCourseListSchema, req);
    const { userId } = body;

    const result = await CourseProgressModel.find({ userId }).populate<{ course: Course & { _id: Types.ObjectId } }>("course").lean();

    const data = result.map(x => ({
        id: x.course._id,
        code: x.course.code,
        title: x.course.title,
        description: x.course.description,
        visible: x.course.visible,
        coverImageUrl: getImageUrl(x.course.coverImageHash),
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
        course = await CourseModel.findById(courseId).lean();
    } else {
        course = await CourseModel.findOne({ code: courseCode }).lean();
    }

    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    let userProgress = await CourseProgressModel.findOne({ course: course._id, userId: currentUserId }).lean();
    if (!userProgress) {
        userProgress = await CourseProgressModel.create({ course: course._id, userId: currentUserId });
    }

    const courseData: CourseResponse = {
        id: course._id.toString(),
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        coverImageUrl: getImageUrl(course.coverImageHash),
        userProgress: {
            updatedAt: userProgress.updatedAt,
            nodesSolved: userProgress.nodesSolved,
            completed: userProgress.completed
        }
    }

    if (includeLessons === true) {
        const lessons = await CourseLessonModel.find({ course: course._id }).sort({ index: "asc" }).lean();

        const lastUnlockedLessonIndex = await getLastUnlockedLessonIndex(userProgress.lastLessonNodeId);

        let lastUnlockedNodeIndex = 1;
        if (userProgress.lastLessonNodeId) {
            const lastLessonNode = await LessonNodeModel.findById(userProgress.lastLessonNodeId, { index: 1 }).lean<{ index: number }>();
            if (lastLessonNode) {
                lastUnlockedNodeIndex = lastLessonNode.index + 1;
            }
        }

        courseData.lessons = lessons.map(lesson => formatLesson(lesson, { lastUnlockedLessonIndex, lastUnlockedNodeIndex, lessonIndex: lesson.index }));
    }

    res.json({
        success: true,
        course: courseData
    });
});

const getLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonSchema, req);
    const { lessonId } = body;
    const currentUserId = req.userId;

    const lesson = await CourseLessonModel.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    const userProgress = await CourseProgressModel.findOne({ course: lesson.course, userId: currentUserId })
        .populate<{ lastLessonNodeId: { index: number, lessonId: Types.ObjectId, _id: Types.ObjectId } | null }>("lastLessonNodeId", { index: 1, lessonId: 1 });
    if (!userProgress) {
        res.status(404).json({ error: [{ message: "User progress not found" }] });
        return;
    }

    const lastUnlockedLessonIndex = await getLastUnlockedLessonIndex(userProgress.lastLessonNodeId?._id);
    if (lesson.index > lastUnlockedLessonIndex) {
        res.status(400).json({ error: [{ message: "Lesson is not unlocked" }] });
        return;
    }

    const lessonData: LessonResponse = {
        id: lesson._id.toString(),
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes,
        comments: lesson.comments
    };

    let lastUnlockedNodeIndex = 1;
    if (userProgress.lastLessonNodeId && lesson._id.equals(userProgress.lastLessonNodeId.lessonId)) {
        lastUnlockedNodeIndex = userProgress.lastLessonNodeId.index + 1;
    }

    const nodes = await LessonNodeModel.find({ lessonId: lesson._id }, { _type: 1, index: 1 }).sort({ index: "asc" });
    lessonData.nodes = nodes.map(x => formatLessonNodeMinimal(x, { lastUnlockedLessonIndex, lastUnlockedNodeIndex, lessonIndex: lesson.index }));

    res.json({
        success: true,
        lesson: lessonData
    });
});

const getLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonNodeSchema, req);
    const { nodeId, mock } = body;
    const currentUserId = req.userId;

    const lessonNode = await LessonNodeModel.findById(nodeId)
        .populate<{ lessonId: CourseLesson }>({ path: "lessonId" })
        .lean();
    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    if (!mock) {
        const userProgress = await CourseProgressModel.findOne({ course: lessonNode.lessonId.course, userId: currentUserId });
        if (!userProgress) {
            res.status(404).json({ error: [{ message: "User progress not found" }] });
            return;
        }

        const { unlocked, isLastUnlocked } = await getLessonNodeInfo(userProgress.lastLessonNodeId, lessonNode._id);
        if (!unlocked) {
            res.status(400).json({ error: [{ message: "Node is not unlocked" }] });
            return;
        }

        if ((lessonNode._type === LessonNodeTypeEnum.TEXT || lessonNode._type === LessonNodeTypeEnum.CODE) && isLastUnlocked) {
            userProgress.$inc("nodesSolved", 1);
            userProgress.lastLessonNodeId = lessonNode._id;
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
            mode: lessonNode.mode ?? 1,
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

    const lessonNode = await LessonNodeModel.findById(nodeId)
        .populate<{ lessonId: { course: mongoose.Types.ObjectId } }>("lessonId", { course: 1 });
    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    let userProgress: DocumentType<CourseProgress> | null = null;
    let isLast = false;
    let correct = false;

    if (mock) {
        const user = await User.findById(currentUserId, { roles: 1 });
        if (!user || ![RolesEnum.CREATOR, RolesEnum.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ error: [{ message: "Unauthorized" }] });
            return;
        }

        switch (mock.type) {
            case LessonNodeTypeEnum.TEXT:
            case LessonNodeTypeEnum.CODE:
                correct = true;
                break;
            case LessonNodeTypeEnum.SINGLECHOICE_QUESTION:
            case LessonNodeTypeEnum.MULTICHOICE_QUESTION:
                correct = mock.answers!.every(answer => {
                    const myAnswer = answers?.find(myAnswer => new Types.ObjectId(answer.id).equals(myAnswer.id));
                    return myAnswer && myAnswer.correct === answer.correct;
                });
                break;
            case LessonNodeTypeEnum.TEXT_QUESTION:
                correct = correctAnswer === mock.correctAnswer;
                break;
        }
    } else {
        userProgress = await CourseProgressModel.findOne({ course: lessonNode.lessonId.course, userId: currentUserId });
        if (!userProgress) {
            res.status(404).json({ error: [{ message: "User progress not found" }] });
            return;
        }

        const nodeInfo = await getLessonNodeInfo(userProgress.lastLessonNodeId, lessonNode._id);
        if (!nodeInfo.unlocked) {
            res.status(400).json({ error: [{ message: "Node is not unlocked" }] });
            return;
        }
        isLast = nodeInfo.isLastUnlocked;

        const nodeAnswers = await QuizAnswer.find({ courseLessonNodeId: lessonNode._id }, { correct: 1 });

        switch (lessonNode._type) {
            case LessonNodeTypeEnum.TEXT:
            case LessonNodeTypeEnum.CODE:
                correct = true;
                break;
            case LessonNodeTypeEnum.SINGLECHOICE_QUESTION:
            case LessonNodeTypeEnum.MULTICHOICE_QUESTION:
                correct = nodeAnswers.every(answer => {
                    const myAnswer = answers?.find(myAnswer => answer._id.equals(myAnswer.id));
                    return myAnswer && myAnswer.correct === answer.correct;
                });
                break;
            case LessonNodeTypeEnum.TEXT_QUESTION:
                correct = correctAnswer === lessonNode.correctAnswer;
                break;
        }

        if (isLast && correct) {
            const lessons = await CourseLessonModel.find({ course: userProgress.course }, { nodes: 1 }).lean<{ nodes: number }[]>();
            const courseNodes = lessons.reduce((count, lesson) => count + lesson.nodes, 0);

            if (courseNodes === userProgress.nodesSolved) {
                userProgress.completed = true;
            }

            userProgress.lastLessonNodeId = lessonNode._id;
            userProgress.$inc("nodesSolved", 1);
            await userProgress.save();
        }
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

    const userProgress = await CourseProgressModel.findOne({ course: courseId, userId: currentUserId });
    if (!userProgress) {
        res.status(404).json({ error: [{ message: "Course progress not found" }] });
        return;
    }

    userProgress.lastLessonNodeId = null;
    userProgress.nodesSolved = 0;
    userProgress.completed = false;
    await userProgress.save();

    res.json({ success: true });
});

const getLessonComments = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonCommentsSchema, req);
    const { lessonId, parentId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    let parentPost: Post & { _id: Types.ObjectId } & { user: UserMinimal & { _id: Types.ObjectId } } | null = null;
    if (parentId) {
        parentPost = await PostModel
            .findById(parentId)
            .populate("user", USER_MINIMAL_FIELDS)
            .lean<Post & { _id: Types.ObjectId } & { user: UserMinimal & { _id: Types.ObjectId } }>();
    }

    let dbQuery = PostModel.find({ lessonId, _type: PostTypeEnum.LESSON_COMMENT, hidden: false });

    let skipCount = index;

    if (findPostId) {
        const reply = await PostModel.findById(findPostId);
        if (!reply) {
            res.status(404).json({ error: [{ message: "Post not found" }] });
            return;
        }

        parentPost = reply.parentId ? await PostModel
            .findById(reply.parentId)
            .populate("user", USER_MINIMAL_FIELDS)
            .lean<Post & { _id: Types.ObjectId } & { user: UserMinimal & { _id: Types.ObjectId } }>()
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
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
        .lean();

    const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
        id: x._id,
        parentId: x.parentId,
        message: x.message,
        date: x.createdAt,
        user: formatUserMinimal(x.user),
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
        getAttachmentsByPostId({ post: item.id }).then(attachments => {
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

    const lesson = await CourseLessonModel.findById(lessonId)
        .populate<{ course: Course }>("course", { title: 1, code: 1 });
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    let parentPost = null;
    if (parentId) {
        parentPost = await PostModel.findById(parentId);
        if (!parentPost) {
            res.status(404).json({ error: [{ message: "Parent post not found" }] });
            return;
        }
    }

    const reply = await PostModel.create({
        _type: PostTypeEnum.LESSON_COMMENT,
        message,
        lessonId,
        parentId,
        user: currentUserId
    });

    if (parentPost && !parentPost.user.equals(currentUserId)) {
        await sendNotifications({
            title: "New reply",
            type: NotificationTypeEnum.LESSON_COMMENT,
            actionUser: new Types.ObjectId(currentUserId),
            message: `{action_user} replied to your comment on lesson "${lesson.title}" to ${lesson.course.title}`,
            lessonId: lesson._id,
            postId: reply._id,
            courseCode: lesson.course.code
        }, [parentPost.user]);
    }

    lesson.$inc("comments", 1);
    await lesson.save();

    if (parentPost) {
        parentPost.$inc("answers", 1);
        await parentPost.save();
    }

    const attachments = await getAttachmentsByPostId({ post: reply._id });

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

    const comment = await PostModel.findById(id);
    if (!comment) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (!comment.user.equals(currentUserId)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    comment.message = message;

    await comment.save();
    const attachments = await getAttachmentsByPostId({ post: comment._id });
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

    const comment = await PostModel.findById(id);
    if (!comment) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }

    if (!comment.user.equals(currentUserId)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const lesson = await CourseLessonModel.findById(comment.lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    await deletePostsAndCleanup({ _id: id });
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