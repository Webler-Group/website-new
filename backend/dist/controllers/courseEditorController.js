"use strict";
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
const MulterFileTypeError_1 = __importDefault(require("../exceptions/MulterFileTypeError"));
const courseEditorSchema_1 = require("../validation/courseEditorSchema");
const zodUtils_1 = require("../utils/zodUtils");
const coverImageUpload = (0, multer_1.default)({
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (/^image\/(png)$/i.test(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new MulterFileTypeError_1.default("Only .png files are allowed"));
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
const createCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.createCourseSchema, req);
    const { title, description, code } = body;
    const course = await Course_1.default.create({
        title,
        description,
        code,
        visible: false
    });
    res.json({
        success: true,
        course: {
            id: course._id,
            code: course.code,
            title: course.title,
            visible: course.visible
        }
    });
});
const getCoursesList = (0, express_async_handler_1.default)(async (req, res) => {
    const result = await Course_1.default.find();
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
const getCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.getCourseSchema, req);
    const { courseId, courseCode, includeLessons } = body;
    let course = null;
    if (courseId) {
        course = await Course_1.default.findById(courseId);
    }
    else {
        course = await Course_1.default.findOne({ code: courseCode });
    }
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }
    let lessons = [];
    if (includeLessons === true) {
        lessons = await CourseLesson_1.default.find({ course: course.id }).sort({ index: "asc" });
        lessons = lessons.map(lesson => ({
            id: lesson._id,
            title: lesson.title,
            index: lesson.index,
            nodeCount: lesson.nodes
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
            lessons
        }
    });
});
const deleteCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.deleteCourseSchema, req);
    const { courseId } = body;
    const course = await Course_1.default.findById(courseId);
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }
    await Course_1.default.deleteAndCleanup(courseId);
    res.json({ success: true });
});
const editCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.editCourseSchema, req);
    const { courseId, code, title, description, visible } = body;
    const course = await Course_1.default.findById(courseId);
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }
    course.title = title;
    course.description = description;
    course.visible = visible;
    course.code = code;
    await course.save();
    res.json({
        success: true,
        data: {
            id: course._id,
            title: course.title,
            description: course.description,
            visible: course.visible
        }
    });
});
const getLesson = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.getLessonSchema, req);
    const { lessonId } = body;
    const lesson = await CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }
    const data = {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes
    };
    await LessonNode_1.default.find({ lessonId: lesson.id }).sort({ index: "asc" }).select("_id _type index").then(result => {
        data.nodes = result.map(x => ({
            id: x._id,
            index: x.index,
            type: x._type
        }));
    });
    res.json({
        success: true,
        lesson: data
    });
});
const getLessonList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.getLessonListSchema, req);
    const { courseId } = body;
    let lessons = await CourseLesson_1.default.find({ course: courseId }).sort({ index: "asc" });
    lessons = lessons.map(lesson => ({
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes
    }));
    res.json({
        success: true,
        lessons
    });
});
const createLesson = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.createLessonSchema, req);
    const { title, courseId } = body;
    const course = await Course_1.default.findById(courseId);
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }
    const lastLessonIndex = await CourseLesson_1.default.countDocuments({ course: courseId });
    const lesson = await CourseLesson_1.default.create({
        title,
        course: courseId,
        index: lastLessonIndex + 1
    });
    res.json({
        success: true,
        lesson: {
            id: lesson._id,
            title: lesson.title,
            index: lesson.index
        }
    });
});
const editLesson = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.editLessonSchema, req);
    const { lessonId, title } = body;
    const lesson = await CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }
    lesson.title = title;
    await lesson.save();
    res.json({
        success: true,
        data: {
            id: lesson._id,
            title: lesson.title,
            index: lesson.index
        }
    });
});
const deleteLesson = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.deleteLessonSchema, req);
    const { lessonId } = body;
    const lesson = await CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }
    await CourseLesson_1.default.deleteAndCleanup({ _id: lessonId });
    await CourseLesson_1.default.updateMany({ course: lesson.course, index: { $gt: lesson.index } }, { $inc: { index: -1 } });
    res.json({ success: true });
});
const uploadCourseCoverImage = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.uploadCourseCoverImageSchema, req);
    const { courseId } = body;
    if (!req.file) {
        res.status(400).json({ error: [{ message: "No file uploaded" }] });
        return;
    }
    const course = await Course_1.default.findById(courseId);
    if (!course) {
        fs_1.default.unlinkSync(req.file.path);
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }
    if (course.coverImage) {
        const oldPath = path_1.default.join(confg_1.config.rootDir, "uploads", "courses", course.coverImage);
        if (fs_1.default.existsSync(oldPath)) {
            fs_1.default.unlinkSync(oldPath);
        }
    }
    course.coverImage = req.file.filename;
    await course.save();
    res.json({ success: true, data: { coverImage: course.coverImage } });
});
const createLessonNode = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.createLessonNodeSchema, req);
    const { lessonId } = body;
    const lesson = await CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }
    lesson.$inc("nodes", 1);
    const lessonNode = await LessonNode_1.default.create({
        lessonId,
        index: lesson.nodes
    });
    await lesson.save();
    res.json({
        success: true,
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type
        }
    });
});
const getLessonNode = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.deleteLessonNodeSchema, req); // Reusing schema as it matches
    const { nodeId } = body;
    const lessonNode = await LessonNode_1.default.findById(nodeId);
    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }
    const answers = await QuizAnswer_1.default.find({ courseLessonNodeId: lessonNode.id });
    res.json({
        success: true,
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type,
            text: lessonNode.text ?? "",
            correctAnswer: lessonNode.correctAnswer ?? "",
            answers: answers.map(x => ({
                id: x._id,
                text: x.text,
                correct: x.correct
            }))
        }
    });
});
const deleteLessonNode = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.deleteLessonNodeSchema, req);
    const { nodeId } = body;
    const node = await LessonNode_1.default.findById(nodeId);
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }
    await LessonNode_1.default.deleteAndCleanup({ _id: nodeId });
    await CourseLesson_1.default.updateOne({ _id: node.lessonId }, {
        $inc: { nodes: -1 }
    });
    await LessonNode_1.default.updateMany({ lessonId: node.lessonId, index: { $gt: node.index } }, { $inc: { index: -1 } });
    res.json({ success: true });
});
const editLessonNode = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.editLessonNodeSchema, req);
    const { nodeId, type, text, correctAnswer, answers } = body;
    const node = await LessonNode_1.default.findById(nodeId);
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }
    node._type = type;
    node.text = text;
    node.correctAnswer = correctAnswer ?? "";
    const currentAnswersIds = (await QuizAnswer_1.default.find({ courseLessonNodeId: node.id }).select("_id")).map(x => x._id.toString());
    const answersToDelete = currentAnswersIds.filter(answerId => !answers?.some((x) => x.id && new mongoose_1.default.Types.ObjectId(x.id).toString() === answerId));
    await node.save();
    await QuizAnswer_1.default.deleteMany({ _id: { $in: answersToDelete } });
    const updatedAnswers = answers?.map(async (answer) => {
        if (answer.id && currentAnswersIds.includes(new mongoose_1.default.Types.ObjectId(answer.id).toString())) {
            await QuizAnswer_1.default.updateOne({ _id: answer.id }, { text: answer.text, correct: answer.correct });
            return answer;
        }
        else {
            const result = await QuizAnswer_1.default.create({
                text: answer.text,
                correct: answer.correct,
                courseLessonNodeId: node.id
            });
            return { ...answer, id: result._id };
        }
    }) || [];
    const savedAnswers = await Promise.all(updatedAnswers);
    res.json({
        success: true,
        data: {
            id: node._id,
            type: node._type,
            text: node.text,
            index: node.index,
            correctAnswer: node.correctAnswer,
            answers: savedAnswers
        }
    });
});
const changeLessonIndex = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.changeLessonIndexSchema, req);
    const { lessonId, newIndex } = body;
    const lesson = await CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }
    const otherLesson = await CourseLesson_1.default.findOne({ course: lesson.course, index: newIndex });
    if (!otherLesson) {
        res.status(400).json({ error: [{ message: "New index is not valid" }] });
        return;
    }
    otherLesson.index = lesson.index;
    lesson.index = newIndex;
    await lesson.save();
    await otherLesson.save();
    res.json({
        success: true,
        data: { index: newIndex }
    });
});
const changeLessonNodeIndex = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseEditorSchema_1.changeLessonNodeIndexSchema, req);
    const { nodeId, newIndex } = body;
    const node = await LessonNode_1.default.findById(nodeId);
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }
    const otherNode = await LessonNode_1.default.findOne({ lessonId: node.lessonId, index: newIndex });
    if (!otherNode) {
        res.status(400).json({ error: [{ message: "New index is not valid" }] });
        return;
    }
    otherNode.index = node.index;
    node.index = newIndex;
    await node.save();
    await otherNode.save();
    res.json({
        success: true,
        data: { index: newIndex }
    });
});
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
