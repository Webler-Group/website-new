import mongoose, { Types } from "mongoose";
import CourseLessonModel, { CourseLesson } from "../models/CourseLesson";
import LessonNodeModel, { LessonNode, LessonNodeMinimal } from "../models/LessonNode";
import QuizAnswerModel, { QuizAnswer } from "../models/QuizAnswer";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import CourseModel from "../models/Course";
import CourseProgressModel from "../models/CourseProgress";
import { deleteEntry } from "./fileHelper";
import { File } from "../models/File";
import { deletePostsAndCleanup } from "./postsHelper";
import HttpError from "../exceptions/HttpError";
import LessonNodeModeEnum from "../data/LessonNodeModeEnum";

export interface LessonNodeMinimalResponse {
    id: Types.ObjectId | string;
    index: number;
    type: LessonNodeTypeEnum;
    unlocked?: boolean;
}

export interface QuizAnswerResponse {
    id: Types.ObjectId | string;
    correct: boolean;
    text: string;
}

export interface LessonNodeResponse {
    id: Types.ObjectId | string;
    index: number;
    type: LessonNodeTypeEnum;
    text: string;
    mode: LessonNodeModeEnum;
    correctAnswer?: string;
    answers?: QuizAnswerResponse[];
}

export interface LessonResponse {
    id: Types.ObjectId | string;
    title: string;
    index: number;
    nodeCount: number;
    comments: number;
    unlocked?: boolean;
    completed?: boolean;
    lastUnlockedNodexIndex?: number;
    nodes?: LessonNodeMinimalResponse[];
}

export interface UserProgress {
    updatedAt: Date;
    nodesSolved: number;
    completed: boolean;
}

export interface CourseResponse {
    id: Types.ObjectId | string;
    code: string;
    title: string;
    description: string;
    visible: boolean;
    coverImageUrl: string | null;
    userProgress?: UserProgress;
    lessons?: LessonResponse[];
}

export interface QuizAnswerJson {
    text: string;
    correct: boolean;
}

export interface LessonNodeJson {
    type: LessonNodeTypeEnum;
    index: number;
    mode: number;
    codeId?: string;
    text: string;
    correctAnswer?: string;
    answers?: QuizAnswerJson[];
}

export interface CourseLessonJson {
    version: number;
    lesson: { title: string };
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
): Promise<LessonNodeJson> => {
    const base: Pick<LessonNodeJson, "type" | "index" | "mode" | "codeId"> = {
        type: node._type,
        index: node.index,
        mode: node.mode,
        codeId: node.codeId?.toString()
    };

    if (node._type === LessonNodeTypeEnum.TEXT) {
        return {
            ...base,
            text: node.text || ""
        };
    }

    if (node._type === LessonNodeTypeEnum.TEXT_QUESTION) {
        return {
            ...base,
            text: node.text || "",
            correctAnswer: node.correctAnswer || ""
        };
    }

    const nodeId = node._id.toString();
    const answers =
        byNodeId?.get(nodeId) ??
        (await QuizAnswerModel.find({ courseLessonNodeId: node._id }).lean().then(r =>
            r.map(a => ({ text: a.text, correct: a.correct }))
        ));

    return {
        ...base,
        text: node.text || "",
        answers
    };
};

export const importLessonNodeFromJson = async (
    lessonId: mongoose.Types.ObjectId | string,
    nodeJson: LessonNodeJson,
    session?: mongoose.ClientSession
): Promise<LessonNode & { _id: Types.ObjectId }> => {
    const correctAnswer =
        nodeJson.type === LessonNodeTypeEnum.TEXT_QUESTION
            ? nodeJson.correctAnswer
            : "";

    const [node] = await LessonNodeModel.create(
        [
            {
                lessonId,
                index: nodeJson.index,
                _type: nodeJson.type,
                mode: nodeJson.mode,
                codeId: (nodeJson.codeId && mongoose.isValidObjectId(nodeJson.codeId))
                    ? new mongoose.Types.ObjectId(nodeJson.codeId)
                    : null,
                text: nodeJson.text,
                correctAnswer: correctAnswer
            }
        ],
        { session }
    );

    if (
        (nodeJson.type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION ||
            nodeJson.type === LessonNodeTypeEnum.MULTICHOICE_QUESTION) &&
        nodeJson.answers?.length
    ) {
        const docs = nodeJson.answers.map(a => ({
            courseLessonNodeId: node._id,
            text: a.text,
            correct: a.correct
        }));
        await QuizAnswerModel.insertMany(docs, { session });
    }

    return node;
};

export const exportCourseLessonToJson = async (lessonId: Types.ObjectId): Promise<CourseLessonJson> => {
    const lesson = await CourseLessonModel.findById(lessonId).lean();
    if (!lesson) {
        throw new HttpError("Lesson not found", 404);
    }

    const nodes = await LessonNodeModel.find({ lessonId: lesson._id }).sort({ index: "asc" }).lean();
    const nodeIds = nodes.map(n => n._id);
    const answers = await QuizAnswerModel.find({ courseLessonNodeId: { $in: nodeIds } }).lean();
    const byNodeId = answersMap(answers);

    const nodeJsons: LessonNodeJson[] = [];
    for (const n of nodes) nodeJsons.push(await exportLessonNodeToJson(n, byNodeId));

    return {
        version: 1,
        lesson: { title: lesson.title },
        nodes: nodeJsons
    };
};

export const importCourseLessonFromJson = async (
    courseId: Types.ObjectId,
    lessonJson: CourseLessonJson,
    session?: mongoose.ClientSession
) => {
    const lastIndex = await CourseLessonModel.countDocuments({ course: courseId }).session(session ?? null);

    const [lesson] = await CourseLessonModel.create(
        [
            {
                title: lessonJson.lesson.title,
                course: courseId,
                index: lastIndex + 1,
                nodes: 0
            }
        ],
        { session }
    );

    for (const nodeJson of lessonJson.nodes) {
        await importLessonNodeFromJson(lesson._id, nodeJson, session);
    }

    lesson.nodes = lessonJson.nodes.length;
    await lesson.save({ session });

    return lesson;
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
        .find(filter, { _id: 1, lessonId: 1 })
        .lean<{ _id: Types.ObjectId; lessonId: Types.ObjectId }[]>()
        .session(session ?? null);

    for (const lessonNode of lessonNodesToDelete) {
        const lesson = await CourseLessonModel.findById(lessonNode.lessonId).session(session ?? null);
        if (lesson) {
            lesson.$inc("nodes", -1);
            await lesson.save({ session });
        }
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
    if (!lessonNode) {
        return result;
    }

    const lessonIndex = lessonNode.lessonId.index;
    let lastCompletedLessonNode = null;

    if (lastLessonNodeId) {
        lastCompletedLessonNode = await LessonNodeModel
            .findById(lastLessonNodeId, { index: 1, lessonId: 1 })
            .populate<{ lessonId: { nodes: number; index: number } }>("lessonId", { node: 1, index: 1 })
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

export const formatLesson = (
    lesson: CourseLesson & { _id: Types.ObjectId },
    userProgressParams?: UserProgressParams
): LessonResponse => {
    const result: LessonResponse = {
        id: lesson._id.toString(),
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes,
        comments: lesson.comments
    };
    if (userProgressParams) {
        result.unlocked = lesson.index <= userProgressParams.lastUnlockedLessonIndex;
        result.completed = lesson.index < userProgressParams.lastUnlockedLessonIndex;
        result.lastUnlockedNodexIndex = lesson.index < userProgressParams.lastUnlockedLessonIndex
            ? lesson.nodes
            : userProgressParams.lastUnlockedNodeIndex;
    }
    return result;
};

export const formatLessonNodeMinimal = (
    lessonNode: LessonNodeMinimal & { _id: Types.ObjectId },
    userProgressParams?: UserProgressParams
): LessonNodeMinimalResponse => {
    const result: LessonNodeMinimalResponse = {
        id: lessonNode._id.toString(),
        index: lessonNode.index,
        type: lessonNode._type,
    };
    if (userProgressParams) {
        result.unlocked =
            userProgressParams.lessonIndex < userProgressParams.lastUnlockedLessonIndex ||
            lessonNode.index <= userProgressParams.lastUnlockedNodeIndex;
    }
    return result;
};