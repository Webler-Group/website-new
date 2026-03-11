import mongoose, { Types } from "mongoose";
import CourseLessonModel, { CourseLesson } from "../models/CourseLesson";
import LessonNodeModel, { LessonNode, LessonNodeMinimal } from "../models/LessonNode";
import QuizAnswerModel, { QuizAnswer } from "../models/QuizAnswer";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import CourseModel, { Course } from "../models/Course";
import CourseProgressModel from "../models/CourseProgress";
import { deleteEntry } from "./fileHelper";
import { File } from "../models/File";
import { deletePostsAndCleanup } from "./postsHelper";
import HttpError from "../exceptions/HttpError";
import LessonNodeModeEnum from "../data/LessonNodeModeEnum";
import { getImageUrl } from "../controllers/mediaController";

export const JSON_VERSION = 1;

export interface LessonNodeMinimalResponse {
    id: string | Types.ObjectId;
    index: number;
    type: LessonNodeTypeEnum;
    mode: LessonNodeModeEnum;
    unlocked?: boolean;
}

export interface QuizAnswerResponse {
    id: string | Types.ObjectId;
    correct: boolean;
    text: string;
}

export interface LessonNodeResponse extends LessonNodeMinimalResponse {
    text: string;
    codeId: string | Types.ObjectId | null;
    correctAnswer?: string;
    answers?: QuizAnswerResponse[];
}

export interface EditLessonNodeResponse {
    id: string | Types.ObjectId;
    type: LessonNodeTypeEnum;
    mode: LessonNodeModeEnum;
    text: string;
    codeId: string | Types.ObjectId | null;
    correctAnswer?: string;
    answers?: QuizAnswerResponse[];
}

export interface LessonProgressInfo {
    unlocked: boolean;
    completed: boolean;
    lastUnlockedNodexIndex: number;
}

export interface LessonResponse<T = LessonProgressInfo> {
    id: string | Types.ObjectId;
    title: string;
    index: number;
    nodeCount: number;
    comments: number;
    userProgress: T;
    nodes?: LessonNodeMinimalResponse[];
}

export interface CourseProgressInfo {
    updatedAt: Date;
    nodesSolved: number;
    completed: boolean;
}

export interface CourseResponse<T = CourseProgressInfo, U = LessonProgressInfo> {
    id: string | Types.ObjectId;
    code: string;
    title: string;
    description: string;
    visible: boolean;
    coverImageUrl: string | null;
    userProgress: T;
    completed?: boolean;
    lessons?: LessonResponse<U>[];
}

export type CourseMinimalResponse = CourseResponse<undefined, undefined>;

export interface QuizAnswerJson {
    text: string;
    correct: boolean;
}

export interface LessonNodeJson {
    version: number;
    type: LessonNodeTypeEnum;
    index: number;
    mode?: number;
    codeId?: string | null;
    text?: string;
    correctAnswer?: string;
    answers?: QuizAnswerJson[];
}

export interface CourseLessonJson {
    version: number;
    title: string;
    nodes: LessonNodeJson[];
}

export interface UserProgressParams {
    lastUnlockedLessonIndex: number;
    lastUnlockedNodeIndex: number;
    lessonIndex: number;
}

export interface LessonNodeInfoResult {
    unlocked: boolean;
    isLastUnlocked: boolean;
}

const answersMap = (answers: QuizAnswer[]): Map<string, QuizAnswerJson[]> => {
    const map = new Map<string, QuizAnswerJson[]>();
    for (const a of answers) {
        if (!a.courseLessonNodeId) continue;
        const key = a.courseLessonNodeId.toString();
        const arr = map.get(key) ?? [];
        arr.push({ text: a.text, correct: a.correct });
        map.set(key, arr);
    }
    return map;
};

export const exportLessonNodeToJson = async (
    node: LessonNode & { _id: Types.ObjectId },
    byNodeId?: Map<string, QuizAnswerJson[]>
) => {
    const data: LessonNodeJson = {
        version: JSON_VERSION,
        type: node._type,
        index: node.index,
        mode: node.mode,
        codeId: node.codeId?.toString()
    };

    if (node._type !== LessonNodeTypeEnum.CODE) {
        data.text = node.text;
    }

    if (node._type === LessonNodeTypeEnum.TEXT_QUESTION) {
        data.correctAnswer = node.correctAnswer;
    }

    if (node._type === LessonNodeTypeEnum.MULTICHOICE_QUESTION || node._type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION) {
        const nodeId = node._id.toString();
        data.answers = byNodeId?.get(nodeId) ?? (await QuizAnswerModel.find({ courseLessonNodeId: node._id }).lean()).map(a => ({ text: a.text, correct: a.correct }));
    }

    return data;
};

export const exportCourseLessonToJson = async (lessonId: Types.ObjectId | string): Promise<CourseLessonJson> => {
    const lesson = await CourseLessonModel.findById(lessonId).lean();
    if (!lesson) throw new HttpError("Lesson not found", 404);

    const nodes = await LessonNodeModel.find({ lessonId: lesson._id }).sort({ index: "asc" }).lean();
    const nodeIds = nodes.map(n => n._id);
    const answers = await QuizAnswerModel.find({ courseLessonNodeId: { $in: nodeIds } }).lean();
    const byNodeId = answersMap(answers);

    const nodeJsons: LessonNodeJson[] = [];
    for (const n of nodes) {
        const nodeJson = await exportLessonNodeToJson(n, byNodeId);
        nodeJsons.push(nodeJson);
    }

    return { version: JSON_VERSION, title: lesson.title, nodes: nodeJsons };
};

export const deleteCourseAndCleanup = async (courseId: Types.ObjectId, session?: mongoose.ClientSession) => {
    const course = await CourseModel
        .findById(courseId)
        .populate<{ coverImageFileId: File }>("coverImageFileId")
        .lean()
        .session(session ?? null);

    if (course) {
        await deleteCourseLessonAndCleanup({ course: course._id }, session);
        await CourseProgressModel.deleteMany({ course: course._id }, { session });

        if (course.coverImageFileId) {
            await deleteEntry(course.coverImageFileId.path, course.coverImageFileId.name);
        }

        await CourseModel.deleteOne({ _id: course._id }, { session });
    }
};

export const deleteCourseLessonAndCleanup = async (
    filter: mongoose.QueryFilter<CourseLesson>,
    session?: mongoose.ClientSession
) => {
    const lessonsToDelete = await CourseLessonModel
        .find(filter, { _id: 1 })
        .lean<{ _id: Types.ObjectId }[]>()
        .session(session ?? null);

    for (const lesson of lessonsToDelete) {
        await deleteLessonNodeAndCleanup({ lessonId: lesson._id }, session);
        await deletePostsAndCleanup({ lessonId: lesson._id }, session);
    }
    await CourseLessonModel.deleteMany(filter, { session });
};

export const deleteLessonNodeAndCleanup = async (
    filter: mongoose.QueryFilter<LessonNode>,
    session?: mongoose.ClientSession
) => {
    const lessonNodesToDelete = await LessonNodeModel
        .find(filter, { _id: 1 })
        .lean<{ _id: Types.ObjectId; lessonId: Types.ObjectId }[]>()
        .session(session ?? null);

    for (const lessonNode of lessonNodesToDelete) {
        await QuizAnswerModel.deleteMany({ courseLessonNodeId: lessonNode._id }, { session });
    }
    await LessonNodeModel.deleteMany(filter, { session });
};

export const getLastUnlockedLessonIndex = async (lastLessonNodeId?: Types.ObjectId | null): Promise<number> => {
    let lastUnlockedLessonIndex = 1;
    if (lastLessonNodeId) {
        const lastCompletedLessonNode = await LessonNodeModel
            .findById(lastLessonNodeId, { index: 1 })
            .populate<{ lessonId: { nodes: number; index: number } }>("lessonId", { nodes: 1, index: 1 })
            .lean();
        if (lastCompletedLessonNode) {
            lastUnlockedLessonIndex =
                lastCompletedLessonNode.lessonId.nodes === lastCompletedLessonNode.index
                    ? lastCompletedLessonNode.lessonId.index + 1
                    : lastCompletedLessonNode.lessonId.index;
        }
    }
    return lastUnlockedLessonIndex;
};

export const getLessonNodeInfo = async (
    lastLessonNodeId: Types.ObjectId | null,
    lessonNodeId: Types.ObjectId
): Promise<LessonNodeInfoResult> => {
    const lessonNode = await LessonNodeModel
        .findById(lessonNodeId, { index: 1 })
        .populate<{ lessonId: { nodes: number; index: number } }>("lessonId", { nodes: 1, index: 1 })
        .lean();

    const result: LessonNodeInfoResult = { unlocked: false, isLastUnlocked: false };
    if (!lessonNode) return result;

    const lessonIndex = lessonNode.lessonId.index;
    let lastCompletedLessonNode = null;

    if (lastLessonNodeId) {
        lastCompletedLessonNode = await LessonNodeModel
            .findById(lastLessonNodeId, { index: 1, lessonId: 1 })
            .populate<{ lessonId: { nodes: number; index: number } }>("lessonId", { nodes: 1, index: 1 })
            .lean();
    }

    if (lastCompletedLessonNode) {
        const lastUnlockedLessonIndex =
            lastCompletedLessonNode.lessonId.nodes === lastCompletedLessonNode.index
                ? lastCompletedLessonNode.lessonId.index + 1
                : lastCompletedLessonNode.lessonId.index;

        if (lessonIndex < lastUnlockedLessonIndex) {
            result.unlocked = true;
        } else if (lessonIndex === lastUnlockedLessonIndex) {
            if (lastCompletedLessonNode.lessonId.nodes === lastCompletedLessonNode.index) {
                result.unlocked = lessonNode.index === 1;
                result.isLastUnlocked = result.unlocked;
            } else {
                result.unlocked = lessonNode.index <= lastCompletedLessonNode.index + 1;
                result.isLastUnlocked = lessonNode.index === lastCompletedLessonNode.index + 1;
            }
        }
    } else {
        result.unlocked = lessonNode.index === 1 && lessonIndex === 1;
        result.isLastUnlocked = result.unlocked;
    }

    return result;
};

export const formatCourseMinimal = (course: Course & { _id: Types.ObjectId }, completed?: boolean) => {
    return {
        id: course._id.toString(),
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        coverImageUrl: getImageUrl(course.coverImageHash),
        userProgress: undefined,
        participants: course.participants ?? 0,
        completed
    };
}

export const formatLesson = (
    lesson: CourseLesson & { _id: Types.ObjectId },
    userProgressParams?: UserProgressParams
): LessonResponse => {
    let userProgress: LessonProgressInfo | undefined;

    if (userProgressParams) {
        const unlocked = lesson.index <= userProgressParams.lastUnlockedLessonIndex;
        const completed = lesson.index < userProgressParams.lastUnlockedLessonIndex;
        const lastUnlockedNodexIndex = completed
            ? lesson.nodes
            : userProgressParams.lastUnlockedNodeIndex;

        userProgress = { unlocked, completed, lastUnlockedNodexIndex };
    }

    return {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes,
        comments: lesson.comments,
        userProgress: userProgress as LessonProgressInfo
    };
};

export const formatLessonNodeMinimal = (
    lessonNode: LessonNodeMinimal & { _id: Types.ObjectId },
    userProgressParams?: UserProgressParams
): LessonNodeMinimalResponse => {
    const result: LessonNodeMinimalResponse = {
        id: lessonNode._id.toString(),
        index: lessonNode.index,
        type: lessonNode._type,
        mode: lessonNode.mode
    };
    if (userProgressParams) {
        result.unlocked =
            userProgressParams.lessonIndex < userProgressParams.lastUnlockedLessonIndex ||
            lessonNode.index <= userProgressParams.lastUnlockedNodeIndex;
    }
    return result;
};