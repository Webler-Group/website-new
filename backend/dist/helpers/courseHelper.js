"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCourseLessonFromJson = exports.exportCourseLessonToJson = exports.importLessonNodeFromJson = exports.exportLessonNodeToJson = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const CourseLesson_1 = __importDefault(require("../models/CourseLesson"));
const LessonNode_1 = __importDefault(require("../models/LessonNode"));
const QuizAnswer_1 = __importDefault(require("../models/QuizAnswer"));
const LessonNodeTypeEnum_1 = __importDefault(require("../data/LessonNodeTypeEnum"));
const answersMap = (answers) => {
    const map = new Map();
    for (const a of answers) {
        const key = a.courseLessonNodeId.toString();
        const arr = map.get(key) ?? [];
        arr.push({ text: a.text, correct: a.correct });
        map.set(key, arr);
    }
    return map;
};
const exportLessonNodeToJson = async (node, byNodeId) => {
    if (node._type === LessonNodeTypeEnum_1.default.TEXT) {
        return {
            type: LessonNodeTypeEnum_1.default.TEXT,
            index: Number(node.index),
            text: String(node.text ?? "")
        };
    }
    if (node._type === LessonNodeTypeEnum_1.default.TEXT_QUESTION) {
        return {
            type: LessonNodeTypeEnum_1.default.TEXT_QUESTION,
            index: Number(node.index),
            prompt: String(node.text ?? ""),
            correctAnswer: String(node.correctAnswer ?? "")
        };
    }
    const nodeId = node._id.toString();
    const answers = byNodeId?.get(nodeId) ??
        (await QuizAnswer_1.default.find({ courseLessonNodeId: node._id }).then(r => r.map(a => ({ text: a.text, correct: a.correct }))));
    if (node._type === LessonNodeTypeEnum_1.default.SINGLECHOICE_QUESTION) {
        return {
            type: LessonNodeTypeEnum_1.default.SINGLECHOICE_QUESTION,
            index: Number(node.index),
            prompt: String(node.text ?? ""),
            answers
        };
    }
    return {
        type: LessonNodeTypeEnum_1.default.MULTICHOICE_QUESTION,
        index: Number(node.index),
        prompt: String(node.text ?? ""),
        answers
    };
};
exports.exportLessonNodeToJson = exportLessonNodeToJson;
const importLessonNodeFromJson = async (lessonId, nodeJson, session) => {
    const text = nodeJson.type === LessonNodeTypeEnum_1.default.TEXT
        ? nodeJson.text
        : nodeJson.prompt;
    const correctAnswer = nodeJson.type === LessonNodeTypeEnum_1.default.TEXT_QUESTION
        ? nodeJson.correctAnswer
        : "";
    const [node] = await LessonNode_1.default.create([
        {
            lessonId,
            index: nodeJson.index,
            _type: nodeJson.type,
            text,
            correctAnswer
        }
    ], { session });
    if (nodeJson.type === LessonNodeTypeEnum_1.default.SINGLECHOICE_QUESTION ||
        nodeJson.type === LessonNodeTypeEnum_1.default.MULTICHOICE_QUESTION) {
        const docs = nodeJson.answers.map(a => ({
            courseLessonNodeId: node._id,
            text: a.text,
            correct: a.correct
        }));
        if (docs.length)
            await QuizAnswer_1.default.insertMany(docs, { session });
    }
    return node;
};
exports.importLessonNodeFromJson = importLessonNodeFromJson;
const exportCourseLessonToJson = async (lessonId) => {
    const lesson = await CourseLesson_1.default.findById(lessonId);
    if (!lesson)
        throw new Error("Lesson not found");
    const nodes = await LessonNode_1.default.find({ lessonId: lesson._id }).sort({ index: "asc" });
    const nodeIds = nodes.map(n => n._id);
    const answers = await QuizAnswer_1.default.find({ courseLessonNodeId: { $in: nodeIds } });
    const byNodeId = answersMap(answers);
    const nodeJsons = [];
    for (const n of nodes)
        nodeJsons.push(await (0, exports.exportLessonNodeToJson)(n, byNodeId));
    return {
        version: 1,
        lesson: { title: lesson.title },
        nodes: nodeJsons
    };
};
exports.exportCourseLessonToJson = exportCourseLessonToJson;
const importCourseLessonFromJson = async (courseId, lessonJson) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const lastIndex = await CourseLesson_1.default.countDocuments({ course: courseId }).session(session);
        const [lesson] = await CourseLesson_1.default.create([
            {
                title: lessonJson.lesson.title,
                course: courseId,
                index: lastIndex + 1,
                nodes: 0
            }
        ], { session });
        for (const nodeJson of lessonJson.nodes) {
            await (0, exports.importLessonNodeFromJson)(lesson._id, nodeJson, session);
        }
        lesson.nodes = lessonJson.nodes.length;
        await lesson.save({ session });
        await session.commitTransaction();
        session.endSession();
        return lesson;
    }
    catch (e) {
        await session.abortTransaction();
        session.endSession();
        throw e;
    }
};
exports.importCourseLessonFromJson = importCourseLessonFromJson;
