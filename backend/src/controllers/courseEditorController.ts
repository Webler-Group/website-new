import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import Course from "../models/Course";
import CourseLesson from "../models/CourseLesson";
import multer from "multer";
import { config } from "../confg";
import path from "path";
import { v4 as uuid } from "uuid";
import fs from "fs";
import LessonNode from "../models/LessonNode";
import QuizAnswer from "../models/QuizAnswer";
import mongoose from "mongoose";

const coverImageUpload = multer({
    limits: { fileSize: 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(null, false);
        }
    },
    storage: multer.diskStorage({
        destination(req, file, cb) {
            const dir = path.join(config.rootDir, "uploads", "courses");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename(req, file, cb) {
            cb(null, uuid() + path.extname(file.originalname));
        }
    })
});

const createCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { title, description, code } = req.body;

    const course = await Course.create({
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
});

const getCoursesList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const result = await Course.find();

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
});

const getCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { courseId, courseCode, includeLessons } = req.body;

    let course = null;
    if (courseId) {
        course = await Course.findById(courseId);
    } else {
        course = await Course.findOne({ code: courseCode });
    }

    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }

    let lessons: any[] = [];
    if (includeLessons === true) {
        lessons = await CourseLesson.find({ courseId: course.id }).sort({ "index": "asc" });
        
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
});

const deleteCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }

    try {
        await Course.deleteAndCleanup(courseId);

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
});

const editCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { courseId, code, title, description, visible } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }

    course.code = code;
    course.title = title;
    course.description = description;
    course.visible = visible;

    try {
        await course.save();

        res.json({
            success: true,
            data: {
                id: course._id,
                title: course.title,
                description: course.description,
                visible: course.visible
            }
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }


});

const getLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { lessonId } = req.body;

    const lesson = await CourseLesson.findById(lessonId);
    if(!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }

    const data: any = {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes
    };
    await LessonNode.find({ lessonId: lesson.id }).sort({ index: "asc" }).select("_id _type index").then(result => {
        data.nodes = result.map(x => ({
            id: x._id,
            index: x.index,
            type: x._type
        }));
    });

    res.json({
        lesson: data
    });
});

const getLessonList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { courseId } = req.body;

    let lessons: any[] = await CourseLesson.find({ courseId }).sort({ "index": "asc" });
    lessons = lessons.map(lesson => ({
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes
    }));

    res.json({
        lessons
    });
});

const createLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { title, courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }

    const lastLessonIndex = await CourseLesson.count({ courseId });

    const lesson = await CourseLesson.create({
        title,
        courseId,
        index: lastLessonIndex + 1
    });

    res.json({
        lesson: {
            id: lesson._id,
            title: lesson.title,
            index: lesson.index
        }
    });
});

const editLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { lessonId, title } = req.body;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }

    lesson.title = title;

    try {
        await lesson.save();

        res.json({
            success: true,
            data: {
                id: lesson._id,
                title: lesson.title,
                index: lesson.index,
            }
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
});

const deleteLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { lessonId } = req.body;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }

    try {
        await CourseLesson.deleteAndCleanup({ _id: lessonId });

        await CourseLesson.updateMany(
            { courseId: lesson.courseId, index: { $gt: lesson.index } }, 
            { $inc: { index: -1 } }
        );

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
});

const uploadCourseCoverImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { courseId } = req.body;

    if (!req.file) {
        res.status(400).json({
            success: false,
            message: "No file uploaded"
        });
        return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
        fs.unlinkSync(req.file.path);

        res.status(404).json({ message: "Course not found" });
        return;
    }

    if (course.coverImage) {
        const oldPath = path.join(config.rootDir, "uploads", "courses", course.coverImage);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }

    course.coverImage = req.file.filename;

    try {
        await course.save();

        res.json({
            success: true
        });
    } catch (err: any) {
        res.json({
            success: false,
            error: err
        });
    }

});

const getLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { nodeId } = req.body;

    const lessonNode = await LessonNode.findById(nodeId);

    if (!lessonNode) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }

    const answers = await QuizAnswer.find({ courseLessonNodeId: lessonNode.id });

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
});

const createLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { lessonId } = req.body;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }

    lesson.$inc("nodes", 1);

    const lessonNode = await LessonNode.create({
        lessonId,
        index: lesson.nodes
    });

    await lesson.save();

    res.json({
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type
        }
    })
});

const deleteLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { nodeId } = req.body;

    const node = await LessonNode.findById(nodeId);
    if (!node) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }

    try {
        await LessonNode.deleteAndCleanup({ _id: nodeId });

        await CourseLesson.updateOne({ _id: node.lessonId }, {
            $inc: { nodes: -1 }
        });

        await LessonNode.updateMany(
            { lessonId: node.lessonId, index: { $gt: node.index } }, 
            { $inc: { index: -1 } }
        );

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
});

const editLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { nodeId, type, text, correctAnswer, answers } = req.body;

    const node = await LessonNode.findById(nodeId);
    if (!node) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }

    node._type = type;
    node.text = text;
    node.correctAnswer = correctAnswer;

    const currentAnswersIds = (await QuizAnswer.find({ courseLessonNodeId: node.id }).select("_id")).map(x => x._id);

    const answersToDelete = [];
    for(let answerId of currentAnswersIds) {
        if(!answers.find((x: any) => new mongoose.Types.ObjectId(x.id) == answerId)) {
            answersToDelete.push(answerId);
        }
    }

    try {
        await node.save();

        await QuizAnswer.deleteMany({ _id: { $in: answersToDelete } });
        for(let answer of answers) {
            let answerId = new mongoose.Types.ObjectId(answer.id);
            if(currentAnswersIds.includes(answerId)) {
                await QuizAnswer.updateOne({ _id: answerId }, { text: answer.text, correct: answer.correct });
            } else {
                const result = await QuizAnswer.create({ text: answer.text, correct: answer.correct, courseLessonNodeId: node.id });
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
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
});

const changeLessonNodeIndex = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { nodeId, newIndex } = req.body;

    const node = await LessonNode.findById(nodeId);
    if (!node) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }

    const otherNode = await LessonNode.findOne({ lessonId: node.lessonId, index: newIndex });
    if (!otherNode) {
        res.status(404).json({ message: "New index is not valid" });
        return;
    }

    otherNode.index = node.index;
    node.index = newIndex;

    try {
        await node.save();
        await otherNode.save();

        res.json({
            success: true,
            data: {
                index: newIndex
            }
        });
    } catch(err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }

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
    getLessonNode,
    createLessonNode,
    getLesson,
    deleteLessonNode,
    editLessonNode,
    changeLessonNodeIndex,
    coverImageUpload
};

export default courseEditorController;