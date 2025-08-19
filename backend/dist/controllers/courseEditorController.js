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
const CourseLesson_1 = __importDefault(require("../models/CourseLesson"));
const multer_1 = __importDefault(require("multer"));
const confg_1 = require("../confg");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const LessonNode_1 = __importDefault(require("../models/LessonNode"));
const QuizAnswer_1 = __importDefault(require("../models/QuizAnswer"));
const mongoose_1 = __importDefault(require("mongoose"));
const coverImageUpload = (0, multer_1.default)({
    limits: { fileSize: 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    },
    storage: multer_1.default.diskStorage({
        destination(req, file, cb) {
            const dir = path_1.default.join(confg_1.config.rootDir, "uploads", "courses");
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename(req, file, cb) {
            cb(null, (0, uuid_1.v4)() + path_1.default.extname(file.originalname));
        }
    })
});
const createCourse = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, description, code } = req.body;
    const course = yield Course_1.default.create({
        title,
        description,
        code,
        visible: false
    });
    res.json({
        course: {
            id: course._id,
            code: course.code,
            title: course.title,
            visible: course.visible
        }
    });
}));
const getCoursesList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Course_1.default.find();
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
const getCourse = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, courseCode, includeLessons } = req.body;
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
    let lessons = [];
    if (includeLessons === true) {
        lessons = yield CourseLesson_1.default.find({ course: course.id }).sort({ "index": "asc" });
        lessons = lessons.map(lesson => ({
            id: lesson._id,
            title: lesson.title,
            index: lesson.index,
            nodeCount: lesson.nodes
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
            lessons
        }
    });
}));
const deleteCourse = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.body;
    const course = yield Course_1.default.findById(courseId);
    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }
    try {
        yield Course_1.default.deleteAndCleanup(courseId);
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
}));
const editCourse = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId, title, description, visible } = req.body;
    const course = yield Course_1.default.findById(courseId);
    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }
    course.title = title;
    course.description = description;
    course.visible = visible;
    try {
        yield course.save();
        res.json({
            success: true,
            data: {
                id: course._id,
                title: course.title,
                description: course.description,
                visible: course.visible
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
}));
const getLesson = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lessonId } = req.body;
    const lesson = yield CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }
    const data = {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes
    };
    yield LessonNode_1.default.find({ lessonId: lesson.id }).sort({ index: "asc" }).select("_id _type index").then(result => {
        data.nodes = result.map(x => ({
            id: x._id,
            index: x.index,
            type: x._type
        }));
    });
    res.json({
        lesson: data
    });
}));
const getLessonNode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nodeId } = req.body;
    const lessonNode = yield LessonNode_1.default.findById(nodeId);
    if (!lessonNode) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }
    const answers = yield QuizAnswer_1.default.find({ courseLessonNodeId: lessonNode.id });
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
const getLessonList = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.body;
    let lessons = yield CourseLesson_1.default.find({ course: courseId }).sort({ "index": "asc" });
    lessons = lessons.map(lesson => ({
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes
    }));
    res.json({
        lessons
    });
}));
const createLesson = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, courseId } = req.body;
    const course = yield Course_1.default.findById(courseId);
    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }
    const lastLessonIndex = yield CourseLesson_1.default.count({ course: courseId });
    const lesson = yield CourseLesson_1.default.create({
        title,
        course: courseId,
        index: lastLessonIndex + 1
    });
    res.json({
        lesson: {
            id: lesson._id,
            title: lesson.title,
            index: lesson.index
        }
    });
}));
const editLesson = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lessonId, title } = req.body;
    const lesson = yield CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }
    lesson.title = title;
    try {
        yield lesson.save();
        res.json({
            success: true,
            data: {
                id: lesson._id,
                title: lesson.title,
                index: lesson.index,
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
}));
const deleteLesson = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lessonId } = req.body;
    const lesson = yield CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }
    try {
        yield CourseLesson_1.default.deleteAndCleanup({ _id: lessonId });
        yield CourseLesson_1.default.updateMany({ course: lesson.course, index: { $gt: lesson.index } }, { $inc: { index: -1 } });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
}));
const uploadCourseCoverImage = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { courseId } = req.body;
    if (!req.file) {
        res.status(400).json({
            success: false,
            message: "No file uploaded"
        });
        return;
    }
    const course = yield Course_1.default.findById(courseId);
    if (!course) {
        fs_1.default.unlinkSync(req.file.path);
        res.status(404).json({ message: "Course not found" });
        return;
    }
    if (course.coverImage) {
        const oldPath = path_1.default.join(confg_1.config.rootDir, "uploads", "courses", course.coverImage);
        if (fs_1.default.existsSync(oldPath)) {
            fs_1.default.unlinkSync(oldPath);
        }
    }
    course.coverImage = req.file.filename;
    try {
        yield course.save();
        res.json({
            success: true
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err
        });
    }
}));
const createLessonNode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lessonId } = req.body;
    const lesson = yield CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }
    lesson.$inc("nodes", 1);
    const lessonNode = yield LessonNode_1.default.create({
        lessonId,
        index: lesson.nodes
    });
    yield lesson.save();
    res.json({
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type
        }
    });
}));
const deleteLessonNode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nodeId } = req.body;
    const node = yield LessonNode_1.default.findById(nodeId);
    if (!node) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }
    try {
        yield LessonNode_1.default.deleteAndCleanup({ _id: nodeId });
        yield CourseLesson_1.default.updateOne({ _id: node.lessonId }, {
            $inc: { nodes: -1 }
        });
        yield LessonNode_1.default.updateMany({ lessonId: node.lessonId, index: { $gt: node.index } }, { $inc: { index: -1 } });
        res.json({ success: true });
    }
    catch (err) {
        res.json({ success: false, error: err });
    }
}));
const editLessonNode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nodeId, type, text, correctAnswer, answers } = req.body;
    const node = yield LessonNode_1.default.findById(nodeId);
    if (!node) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }
    node._type = type;
    node.text = text;
    node.correctAnswer = correctAnswer;
    const currentAnswersIds = (yield QuizAnswer_1.default.find({ courseLessonNodeId: node.id }).select("_id")).map(x => x._id);
    const answersToDelete = [];
    for (let answerId of currentAnswersIds) {
        if (!answers.find((x) => new mongoose_1.default.Types.ObjectId(x.id) == answerId)) {
            answersToDelete.push(answerId);
        }
    }
    try {
        yield node.save();
        yield QuizAnswer_1.default.deleteMany({ _id: { $in: answersToDelete } });
        for (let answer of answers) {
            let answerId = new mongoose_1.default.Types.ObjectId(answer.id);
            if (currentAnswersIds.includes(answerId)) {
                yield QuizAnswer_1.default.updateOne({ _id: answerId }, { text: answer.text, correct: answer.correct });
            }
            else {
                const result = yield QuizAnswer_1.default.create({ text: answer.text, correct: answer.correct, courseLessonNodeId: node.id });
                answer.id = result._id;
            }
        }
        res.json({
            success: true,
            data: {
                id: node._id,
                type: node._type,
                text: node.text,
                index: node.index,
                correctAnswer: node.correctAnswer,
                answers
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
}));
const changeLessonIndex = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lessonId, newIndex } = req.body;
    const lesson = yield CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }
    const otherLesson = yield CourseLesson_1.default.findOne({ course: lesson.course, index: newIndex });
    if (!otherLesson) {
        res.status(404).json({ message: "New index is not valid" });
        return;
    }
    otherLesson.index = lesson.index;
    lesson.index = newIndex;
    try {
        yield lesson.save();
        yield otherLesson.save();
        res.json({
            success: true,
            data: {
                index: newIndex
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
}));
const changeLessonNodeIndex = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { nodeId, newIndex } = req.body;
    const node = yield LessonNode_1.default.findById(nodeId);
    if (!node) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }
    const otherNode = yield LessonNode_1.default.findOne({ lessonId: node.lessonId, index: newIndex });
    if (!otherNode) {
        res.status(404).json({ message: "New index is not valid" });
        return;
    }
    otherNode.index = node.index;
    node.index = newIndex;
    try {
        yield node.save();
        yield otherNode.save();
        res.json({
            success: true,
            data: {
                index: newIndex
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
}));
const courseEditorController = {
    createCourse,
    getCoursesList,
    createLesson,
    getCourse,
    deleteCourse,
    editCourse,
    uploadCourseCoverImage,
    getLessonList,
    editLesson,
    deleteLesson,
    createLessonNode,
    getLesson,
    getLessonNode,
    deleteLessonNode,
    editLessonNode,
    changeLessonNodeIndex,
    changeLessonIndex,
    coverImageUpload
};
exports.default = courseEditorController;
