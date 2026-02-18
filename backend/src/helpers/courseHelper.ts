import mongoose from "mongoose";
import CourseLesson from "../models/CourseLesson";
import LessonNode from "../models/LessonNode";
import QuizAnswer from "../models/QuizAnswer";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";

export type LessonNodeJson = {
    type: LessonNodeTypeEnum;
    index: number;
    mode?: number;
    codeId?: string;
    text?: string;
    prompt?: string;
    correctAnswer?: string;
    answers?: Array<{ text: string; correct: boolean }>;
};

export type CourseLessonJson = {
    version: 1;
    lesson: { title: string };
    nodes: LessonNodeJson[];
};

const answersMap = (answers: any[]) => {
    const map = new Map<string, Array<{ text: string; correct: boolean }>>();
    for (const a of answers) {
        const key = a.courseLessonNodeId.toString();
        const arr = map.get(key) ?? [];
        arr.push({ text: a.text, correct: a.correct });
        map.set(key, arr);
    }
    return map;
};

export const exportLessonNodeToJson = async (
    node: any,
    byNodeId?: Map<string, Array<{ text: string; correct: boolean }>>
): Promise<LessonNodeJson> => {
    const base = {
        type: node._type,
        index: Number(node.index),
        mode: node.mode,
        codeId: node.codeId?.toString()
    };

    if (node._type === LessonNodeTypeEnum.TEXT) {
        return {
            ...base,
            text: String(node.text ?? "")
        };
    }

    if (node._type === LessonNodeTypeEnum.TEXT_QUESTION) {
        return {
            ...base,
            prompt: String(node.text ?? ""),
            correctAnswer: String(node.correctAnswer ?? "")
        };
    }

    const nodeId = node._id.toString();
    const answers =
        byNodeId?.get(nodeId)! ??
        (await QuizAnswer.find({ courseLessonNodeId: node._id }).then(r =>
            r.map(a => ({ text: a.text, correct: a.correct }))
        ));

    if (node._type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION) {
        return {
            ...base,
            prompt: String(node.text ?? ""),
            answers
        };
    }

    return {
        ...base,
        prompt: String(node.text ?? ""),
        answers
    };
};

export const importLessonNodeFromJson = async (
    lessonId: mongoose.Types.ObjectId | string,
    nodeJson: LessonNodeJson,
    session: mongoose.ClientSession
) => {
    const text =
        nodeJson.type === LessonNodeTypeEnum.TEXT
            ? nodeJson.text
            : nodeJson.prompt;

    const correctAnswer =
        nodeJson.type === LessonNodeTypeEnum.TEXT_QUESTION
            ? nodeJson.correctAnswer
            : "";

    const [node] = await LessonNode.create(
        [
            {
                lessonId,
                index: nodeJson.index,
                _type: nodeJson.type,
                mode: nodeJson.mode,
                codeId: (nodeJson.codeId && mongoose.isValidObjectId(nodeJson.codeId)) ? new mongoose.Types.ObjectId(nodeJson.codeId) : null,
                text: text || "",
                correctAnswer: correctAnswer || ""
            }
        ],
        { session }
    );

    if (
        (nodeJson.type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION ||
            nodeJson.type === LessonNodeTypeEnum.MULTICHOICE_QUESTION) &&
        nodeJson.answers
    ) {
        const docs = nodeJson.answers.map(a => ({
            courseLessonNodeId: node._id,
            text: a.text,
            correct: a.correct
        }));
        if (docs.length) await QuizAnswer.insertMany(docs, { session });
    }

    return node;
};

export const exportCourseLessonToJson = async (lessonId: string): Promise<CourseLessonJson> => {
    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found");

    const nodes = await LessonNode.find({ lessonId: lesson._id }).sort({ index: "asc" });
    const nodeIds = nodes.map(n => n._id);
    const answers = await QuizAnswer.find({ courseLessonNodeId: { $in: nodeIds } });
    const byNodeId = answersMap(answers);

    const nodeJsons: LessonNodeJson[] = [];
    for (const n of nodes) nodeJsons.push(await exportLessonNodeToJson(n, byNodeId));

    return {
        version: 1,
        lesson: { title: lesson.title },
        nodes: nodeJsons
    };
};

export const importCourseLessonFromJson = async (courseId: string, lessonJson: CourseLessonJson) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const lastIndex = await CourseLesson.countDocuments({ course: courseId }).session(session);

        const [lesson] = await CourseLesson.create(
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

        await session.commitTransaction();
        session.endSession();

        return lesson;
    } catch (e) {
        await session.abortTransaction();
        session.endSession();
        throw e;
    }
};
