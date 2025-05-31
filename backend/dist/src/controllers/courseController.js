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
const getCourseList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { excludeUserId } = req.body;
    let result;
    if (typeof excludeUserId !== "undefined") {
        const progresses = yield CourseProgress_1.default.find({ userId: excludeUserId }).select("courseId");
        const startedCourseIds = progresses.map(x => x.courseId);
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
        .populate("courseId");
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
    let userProgress = yield CourseProgress_1.default.findOne({ courseId: course.id, userId: currentUserId });
    if (!userProgress) {
        userProgress = yield CourseProgress_1.default.create({ courseId: course.id, userId: currentUserId });
    }
    let lessons = [];
    if (includeLessons === true) {
        lessons = yield CourseLesson_1.default.find({ courseId: course.id }).sort({ "index": "asc" });
        let lastLessonIndex = 1;
        if (userProgress.lastLessonNodeId) {
            const lastLessonNode = yield LessonNode_1.default.findById(userProgress.lastLessonNodeId);
            if (lastLessonNode) {
                const lastLesson = yield CourseLesson_1.default.findById(lastLessonNode.lessonId);
                if (lastLesson) {
                    lastLessonIndex = lastLesson.nodes == lastLessonNode.index ? lastLesson.index + 1 : lastLesson.index;
                }
            }
        }
        lessons = lessons.map(lesson => ({
            id: lesson._id,
            title: lesson.title,
            index: lesson.index,
            nodeCount: lesson.nodes,
            unlocked: lesson.index <= lastLessonIndex
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
const courseController = {
    getCourseList,
    getUserCourseList,
    getCourse
};
exports.default = courseController;
