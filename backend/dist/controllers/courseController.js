"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Course_1 = __importDefault(require("../models/Course"));
const CourseProgress_1 = __importDefault(require("../models/CourseProgress"));
const CourseLesson_1 = __importDefault(require("../models/CourseLesson"));
const LessonNode_1 = __importDefault(require("../models/LessonNode"));
const QuizAnswer_1 = __importDefault(require("../models/QuizAnswer"));
const User_1 = __importDefault(require("../models/User"));
const getCourseList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { excludeUserId } = req.body;
    let result;
    if (typeof excludeUserId !== "undefined") {
        const progresses = yield CourseProgress_1.default.find({ userId: excludeUserId }).select("course");
        const startedCourseIds = progresses.map(x => x.course);
        result = yield Course_1.default.find({
            visible: true,
            _id: { $nin: startedCourseIds }
        });
    }
    else {
        result = yield Course_1.default.find({ visible: true });
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
        courses: data
    });
}));
const getUserCourseList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    const result = yield CourseProgress_1.default.find({ userId })
        .populate("course");
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
        courses: data
    });
}));
const getCourse = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, courseCode, includeLessons } = req.body;
    const currentUserId = req.userId;
    let course = null;
    if (courseId) {
        course = yield Course_1.default.findById(courseId);
    }
    else {
        course = yield Course_1.default.findOne({ code: courseCode });
    }
    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }
    let userProgress = yield CourseProgress_1.default.findOne({ course: course.id, userId: currentUserId });
    if (!userProgress) {
        userProgress = yield CourseProgress_1.default.create({ course: course.id, userId: currentUserId });
    }
    let lessons = [];
    if (includeLessons === true) {
        lessons = yield CourseLesson_1.default.find({ course: course.id }).sort({ "index": "asc" });
        const lastUnlockedLessonIndex = yield userProgress.getLastUnlockedLessonIndex();
        let lastUnlockedNodeIndex = 1;
        if (userProgress.lastLessonNodeId) {
            const lastLessonNode = yield LessonNode_1.default.findById(userProgress.lastLessonNodeId).select("index");
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
                completed: userProgress.completed
            }
        }
    });
}));
const getLesson = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { lessonId } = req.body;
    const currentUserId = req.userId;
    const lesson = yield CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }
    const userProgress = yield CourseProgress_1.default.findOne({ course: lesson.course, userId: currentUserId }).populate("lastLessonNodeId", "index lessonId");
    if (!userProgress) {
        res.status(404).json({ message: "User progress not found" });
        return;
    }
    const lastUnlockedLessonIndex = yield userProgress.getLastUnlockedLessonIndex();
    if (lesson.index > lastUnlockedLessonIndex) {
        res.status(400).json({ message: "Lesson is not unlocked" });
        return;
    }
    const data = {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes
    };
    let lastUnlockedNodeIndex = 1;
    if (lesson._id.equals((_a = userProgress.lastLessonNodeId) === null || _a === void 0 ? void 0 : _a.lessonId)) {
        lastUnlockedNodeIndex = userProgress.lastLessonNodeId.index + 1;
    }
    const nodes = yield LessonNode_1.default.find({ lessonId: lesson._id }).sort({ index: "asc" }).select("_id _type index");
    data.nodes = nodes.map(x => ({
        id: x._id,
        index: x.index,
        type: x._type,
        unlocked: lesson.index < lastUnlockedLessonIndex || x.index <= lastUnlockedNodeIndex
    }));
    res.json({
        lesson: data
    });
}));
const getLessonNode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nodeId, mock } = req.body;
    const currentUserId = req.userId;
    const lessonNode = yield LessonNode_1.default.findById(nodeId)
        .populate("lessonId");
    if (!lessonNode) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }
    if (!mock) {
        const userProgress = yield CourseProgress_1.default.findOne({ course: lessonNode.lessonId.course, userId: currentUserId });
        if (!userProgress) {
            res.status(404).json({ message: "User progress not found" });
            return;
        }
        const { unlocked, isLast } = yield userProgress.getLessonNodeInfo(lessonNode._id);
        if (!unlocked) {
            res.status(400).json({ message: "Node is not unlocked" });
            return;
        }
        if (lessonNode._type == 1 && isLast) {
            userProgress.lastLessonNodeId = lessonNode._id;
            yield userProgress.save();
        }
    }
    else {
        const user = yield User_1.default.findById(currentUserId).select("roles");
        if (!user || !["Creator", "Admin"].some(role => user.roles.includes(role))) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
    }
    const answers = yield QuizAnswer_1.default.find({ courseLessonNodeId: lessonNode._id });
    res.json({
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type,
            text: lessonNode.text,
            correctAnswer: lessonNode.correctAnswer,
            answers: answers.map(x => ({
                id: x._id,
                text: x.text,
                correct: x.correct
            }))
        }
    });
}));
const solve = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nodeId, correctAnswer, answers, mock } = req.body;
    const currentUserId = req.userId;
    const lessonNode = yield LessonNode_1.default.findById(nodeId)
        .populate("lessonId");
    if (!lessonNode) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }
    let userProgress = null;
    let isLast = false;
    if (!mock) {
        userProgress = (yield CourseProgress_1.default.findOne({ course: lessonNode.lessonId.course, userId: currentUserId }).populate("lastLessonNodeId", "index"));
        if (!userProgress) {
            res.status(404).json({ message: "User progress not found" });
            return;
        }
        const nodeInfo = yield userProgress.getLessonNodeInfo(lessonNode._id);
        if (!nodeInfo.unlocked) {
            res.status(400).json({ message: "Node is not unlocked" });
            return;
        }
        isLast = nodeInfo.isLast;
    }
    else {
        const user = yield User_1.default.findById(currentUserId).select("roles");
        if (!user || !["Creator", "Admin"].some(role => user.roles.includes(role))) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
    }
    const nodeAnswers = yield QuizAnswer_1.default.find({ courseLessonNodeId: lessonNode.id }).select("correct");
    let correct = false;
    switch (lessonNode._type) {
        case 1: {
            correct = true;
            break;
        }
        case 2:
        case 3: {
            correct = nodeAnswers.every(x => {
                const myAnswer = answers.find((y) => y.id == x._id);
                return myAnswer && myAnswer.correct == x.correct;
            });
            break;
        }
        case 4: {
            correct = correctAnswer == lessonNode.correctAnswer;
            break;
        }
    }
    if (!mock && isLast && correct) {
        userProgress.lastLessonNodeId = lessonNode.id;
        yield userProgress.save();
    }
    res.json({
        success: true,
        data: {
            correct
        }
    });
}));
const resetCourseProgress = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.body;
    const currentUserId = req.userId;
    const userProgress = yield CourseProgress_1.default.findOne({ course: courseId, userId: currentUserId });
    if (!userProgress) {
        res.status(404).json({ message: "Course progress not found" });
        return;
    }
    userProgress.lastLessonNodeId = null;
    userProgress.save();
    res.json({
        success: true
    });
}));
const courseController = {
    getCourseList,
    getUserCourseList,
    getCourse,
    getLesson,
    getLessonNode,
    solve,
    resetCourseProgress
};
exports.default = courseController;
