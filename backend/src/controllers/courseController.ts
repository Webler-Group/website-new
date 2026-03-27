import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import CourseModel, { Course } from "../models/Course";
import CourseProgressModel, { CourseProgress } from "../models/CourseProgress";
import CourseLessonModel, { CourseLesson } from "../models/CourseLesson";
import LessonNodeModel from "../models/LessonNode";
import QuizAnswer from "../models/QuizAnswer";
import User from "../models/User";
import RolesEnum from "../data/RolesEnum";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import PostModel from "../models/Post";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import PostTypeEnum from "../data/PostTypeEnum";
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
import {
    CourseProgressInfo,
    CourseResponse,
    formatCourseMinimal,
    formatLesson,
    formatLessonNodeMinimal,
    getLessonNodeInfo,
    getUnlockedIndexes,
    isCourseCompleted,
    LessonProgressInfo,
    LessonResponse
} from "../helpers/courseHelper";
import { getAttachmentsByPostId, savePost } from "../helpers/postsHelper";
import { sendNotifications } from "../helpers/notificationHelper";
import { withTransaction } from "../utils/transaction";
import HttpError from "../exceptions/HttpError";
import { deleteComment, editComment, getCommmentsList } from "../helpers/commentsHelper";

const getCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCourseListSchema, req);
    const { excludeUserId } = body;

    let result;
    if (excludeUserId) {
        const progresses = await CourseProgressModel.find({ userId: excludeUserId }, { course: 1 }).lean();
        const startedCourseIds = progresses.map(x => x.course);
        result = await CourseModel.find({ visible: true, _id: { $nin: startedCourseIds } }).lean();
    } else {
        result = await CourseModel.find({ visible: true }).lean();
    }

    res.json({
        success: true,
        data: {
            courses: result.map(course => formatCourseMinimal(course))
        }
    });
});

const getUserCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUserCourseListSchema, req);
    const { userId } = body;

    const result = await CourseProgressModel.find({ userId })
        .populate<{ course: Course & { _id: Types.ObjectId } }>("course")
        .lean();

    res.json({
        success: true,
        data: {
            courses: result.map(x => formatCourseMinimal(x.course, x.completed))
        }
    });
});

const getCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCourseSchema, req);
    const { courseId, courseCode, includeLessons } = body;
    const currentUserId = req.userId;

    const course = courseId
        ? await CourseModel.findById(courseId)
        : await CourseModel.findOne({ code: courseCode });

    if (!course) {
        throw new HttpError("Course not found", 404);
    }

    const userProgress = await withTransaction(async (session) => {
        let progress = await CourseProgressModel.findOne({ course: course._id, userId: currentUserId }).lean().session(session);
        if (!progress) {
            [progress] = await CourseProgressModel.create(
                [{ course: course._id, userId: currentUserId }],
                { session }
            );

            course.$inc("participants", 1);
            await course.save({ session });
        }

        return progress;
    });

    const courseProgressInfo: CourseProgressInfo = {
        updatedAt: userProgress.updatedAt,
        completed: userProgress.completed
    };

    const courseData: CourseResponse<CourseProgressInfo, LessonProgressInfo> = {
        id: course._id,
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        coverImageUrl: getImageUrl(course.coverImageHash),
        css: course.css,
        userProgress: courseProgressInfo
    };

    if (includeLessons === true) {
        const [lessons, { lastUnlockedLessonIndex, lastUnlockedNodeIndex }] = await Promise.all([
            CourseLessonModel.find({ course: course._id }).sort({ index: "asc" }).lean(),
            getUnlockedIndexes(userProgress)
        ]);

        courseData.lessons = lessons.map(lesson =>
            formatLesson(lesson, { lastUnlockedLessonIndex, lastUnlockedNodeIndex, lessonIndex: lesson.index })
        );
    }

    res.json({ success: true, data: { course: courseData } });
});

const getLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonSchema, req);
    const { lessonId } = body;
    const currentUserId = req.userId;

    const lesson = await CourseLessonModel.findById(lessonId).lean();
    if (!lesson) {
        throw new HttpError("Lesson not found", 404);
    }

    const [course, userProgress] = await Promise.all([
        CourseModel.findById(lesson.course, { css: 1 }).lean(),
        CourseProgressModel.findOne({ course: lesson.course, userId: currentUserId }).lean()
    ]);

    if (!userProgress) {
        throw new HttpError("User progress not found", 404);
    }

    const { lastUnlockedLessonIndex, lastUnlockedNodeIndex } = await getUnlockedIndexes(userProgress);

    if (lesson.index > lastUnlockedLessonIndex) {
        throw new HttpError("Lesson is not unlocked", 400);
    }

    const nodes = await LessonNodeModel.find({ lessonId: lesson._id }, { _type: 1, index: 1 }).sort({ index: "asc" }).lean();

    const lessonProgressInfo: LessonProgressInfo = {
        unlocked: lesson.index <= lastUnlockedLessonIndex,
        completed: lesson.index < lastUnlockedLessonIndex,
        lastUnlockedNodexIndex: lastUnlockedNodeIndex
    };

    const lessonData: LessonResponse<LessonProgressInfo> = {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes,
        comments: lesson.comments,
        userProgress: lessonProgressInfo,
        nodes: nodes.map(x => formatLessonNodeMinimal(x, { lastUnlockedLessonIndex, lastUnlockedNodeIndex, lessonIndex: lesson.index }))
    };

    res.json({ success: true, data: { lesson: lessonData, css: course?.css } });
});

const getLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonNodeSchema, req);
    const { nodeId, mock } = body;
    const currentUserId = req.userId;

    const lessonNode = await LessonNodeModel.findById(nodeId)
        .populate<{ lessonId: CourseLesson }>("lessonId")
        .lean();
    if (!lessonNode) {
        throw new HttpError("Lesson node not found", 404);
    }

    if (!mock) {
        const userProgress = await CourseProgressModel.findOne({ course: lessonNode.lessonId.course, userId: currentUserId });
        if (!userProgress) {
            throw new HttpError("User progress not found", 404);
        }

        const { lastUnlockedLessonIndex, lastUnlockedNodeIndex } = await getUnlockedIndexes(userProgress);
        const { unlocked } = await getLessonNodeInfo(lastUnlockedLessonIndex, lastUnlockedNodeIndex, lessonNode._id);
        if (!unlocked) {
            throw new HttpError("Node is not unlocked", 400);
        }
    } else {
        if (![RolesEnum.CREATOR, RolesEnum.ADMIN].some(role => req.roles!.includes(role))) {
            throw new HttpError("Unauthorized", 403);
        }
    }

    const answers = await QuizAnswer.find({ courseLessonNodeId: lessonNode._id }).lean();

    res.json({
        success: true,
        data: {
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
        throw new HttpError("Lesson node not found", 404);
    }

    let userProgress: DocumentType<CourseProgress> | null = null;
    let isLast = false;
    let correct = false;

    if (mock) {
        const user = await User.findById(currentUserId, { roles: 1 }).lean();
        if (!user || ![RolesEnum.CREATOR, RolesEnum.ADMIN].some(role => user.roles.includes(role))) {
            throw new HttpError("Unauthorized", 403);
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
            throw new HttpError("User progress not found", 404);
        }

        const { lastUnlockedLessonIndex, lastUnlockedNodeIndex } = await getUnlockedIndexes(userProgress);
        const nodeInfo = await getLessonNodeInfo(lastUnlockedLessonIndex, lastUnlockedNodeIndex, lessonNode._id);
        if (!nodeInfo.unlocked) {
            throw new HttpError("Node is not unlocked", 400);
        }
        isLast = nodeInfo.isLastUnlocked;

        const nodeAnswers = await QuizAnswer.find({ courseLessonNodeId: lessonNode._id }, { correct: 1 }).lean();

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
            userProgress.lastLessonIndex = lastUnlockedLessonIndex;
            userProgress.lastNodeIndex = lastUnlockedNodeIndex;
            const isCompleted = await isCourseCompleted(userProgress.course, lastUnlockedLessonIndex, lastUnlockedNodeIndex);
            if (isCompleted) {
                userProgress.completed = true;
            }

            await userProgress.save();
        }
    }

    res.json({ success: true, data: { correct } });
});

const resetCourseProgress = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(resetCourseProgressSchema, req);
    const { courseId } = body;
    const currentUserId = req.userId;

    const userProgress = await CourseProgressModel.findOne({ course: courseId, userId: currentUserId });
    if (!userProgress) {
        throw new HttpError("Course progress not found", 404);
    }

    userProgress.lastLessonIndex = undefined;
    userProgress.lastNodeIndex = undefined;
    userProgress.completed = false;
    await userProgress.save();

    res.json({ success: true });
});

const getLessonComments = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonCommentsSchema, req);
    const { lessonId, parentId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;

    const data = await getCommmentsList({
        postFilter: { lessonId, _type: PostTypeEnum.LESSON_COMMENT },
        parentId,
        index,
        count,
        filter,
        findPostId,
        userId: currentUserId
    });

    res.json({ success: true, data: { posts: data } });
});

const createLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createLessonCommentSchema, req);
    const { lessonId, message, parentId } = body;
    const currentUserId = req.userId;

    const reply = await withTransaction(async (session) => {
        const lesson = await CourseLessonModel.findById(lessonId)
            .populate<{ course: Course & { _id: Types.ObjectId; code: string; title: string } }>("course", { title: 1, code: 1 })
            .session(session);
        if (!lesson) throw new HttpError("Lesson not found", 404);

        let parentPost = null;
        if (parentId) {
            parentPost = await PostModel.findById(parentId).session(session);
            if (!parentPost) throw new HttpError("Parent post not found", 404);
        }

        const reply = new PostModel({
            _type: PostTypeEnum.LESSON_COMMENT,
            message,
            lessonId,
            parentId,
            user: currentUserId
        });
        const notifications = await savePost(reply, session);

        if (parentPost && !parentPost.user.equals(currentUserId) && !notifications.some(x => x.user.equals(parentPost.user))) {
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
        await lesson.save({ session });

        if (parentPost) {
            parentPost.$inc("answers", 1);
            await parentPost.save({ session });
        }

        return reply;
    });

    const attachments = await getAttachmentsByPostId({ post: reply._id });

    res.json({
        success: true,
        data: {
            post: {
                id: reply._id,
                message: reply.message,
                date: reply.createdAt,
                parentId: reply.parentId,
                votes: reply.votes,
                answers: reply.answers,
                attachments
            }
        }
    });
});

const editLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editLessonCommentSchema, req);
    const { id, message } = body;
    const currentUserId = req.userId;

    const data = await editComment(id, currentUserId!, message);

    res.json({ success: true, data });
});

const deleteLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteLessonCommentSchema, req);
    const { id } = body;
    const currentUserId = req.userId;

    await deleteComment(id, currentUserId!);

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