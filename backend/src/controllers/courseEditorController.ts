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
import MulterFileTypeError from "../exceptions/MulterFileTypeError";
import {
    createCourseSchema,
    getCourseSchema,
    deleteCourseSchema,
    editCourseSchema,
    getLessonSchema,
    getLessonListSchema,
    createLessonSchema,
    editLessonSchema,
    deleteLessonSchema,
    uploadCourseCoverImageSchema,
    createLessonNodeSchema,
    deleteLessonNodeSchema,
    editLessonNodeSchema,
    changeLessonIndexSchema,
    changeLessonNodeIndexSchema,
    exportCourseLessonSchema,
    importCourseSchema,
    exportCourseSchema
} from "../validation/courseEditorSchema";
import { parseWithZod } from "../utils/zodUtils";
import { exportCourseLessonToJson } from "../helpers/courseHelper";
import { createFolder, deleteEntry, listDirectory, moveEntry, uploadImageToBlob } from "../helpers/fileHelper";
import uploadImage from "../middleware/uploadImage";
import File from "../models/File";
import { createImageFolderSchema, deleteImageSchema, getImageListSchema, moveImageSchema, uploadImageSchema } from "../validation/imagesSchema";
import FileTypeEnum from "../data/FileTypeEnum";

const createCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createCourseSchema, req);
    const { title, description, code } = body;

    const course = await Course.create({
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
        success: true,
        courses: data
    });
});

const getCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCourseSchema, req);
    const { courseId, courseCode, includeLessons } = body;

    let course = null;
    if (courseId) {
        course = await Course.findById(courseId);
    } else {
        course = await Course.findOne({ code: courseCode });
    }

    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    let lessons: any[] = [];
    if (includeLessons === true) {
        lessons = await CourseLesson.find({ course: course.id }).sort({ index: "asc" });
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

const deleteCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteCourseSchema, req);
    const { courseId } = body;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    await Course.deleteAndCleanup(courseId);
    res.json({ success: true });
});

const editCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editCourseSchema, req);
    const { courseId, code, title, description, visible } = body;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    if (code !== course.code) {
        const existingCourse = await Course.findOne({ code });
        if (existingCourse) {
            res.status(400).json({ error: [{ message: "Course code already exists" }] });
            return;
        }
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
            visible: course.visible,
            code: course.code
        }
    });
});

const getLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonSchema, req);
    const { lessonId } = body;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
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
        success: true,
        lesson: data
    });
});

const getLessonList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonListSchema, req);
    const { courseId } = body;

    let lessons: any[] = await CourseLesson.find({ course: courseId }).sort({ index: "asc" });
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

const createLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createLessonSchema, req);
    const { title, courseId } = body;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    const lastLessonIndex = await CourseLesson.countDocuments({ course: courseId });

    const lesson = await CourseLesson.create({
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

const editLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editLessonSchema, req);
    const { lessonId, title } = body;

    const lesson = await CourseLesson.findById(lessonId);
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

const deleteLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteLessonSchema, req);
    const { lessonId } = body;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    await CourseLesson.deleteAndCleanup({ _id: lessonId });
    await CourseLesson.updateMany(
        { course: lesson.course, index: { $gt: lesson.index } },
        { $inc: { index: -1 } }
    );
    res.json({ success: true });
});

const uploadCourseCoverImage = asyncHandler(
    async (req: IAuthRequest, res: Response) => {
        const { body, file } = parseWithZod(uploadCourseCoverImageSchema, req);
        const { courseId } = body;
        const currentUserId = req.userId;

        const course = await Course.findById(courseId);
        if (!course) {
            res.status(404).json({ error: [{ message: "Course not found" }] });
            return;
        }

        const fileDoc = await uploadImageToBlob({
            authorId: currentUserId!,
            buffer: file.buffer,
            name: "cover",
            path: `courses/${course._id}/cover`,
            inputMime: file.mimetype,
            maxWidth: 512,
            maxHeight: 512,
            fit: "cover",
            outputFormat: "webp",
            quality: 82,
        });

        course.coverImage = fileDoc._id;
        await course.save();

        res.json({
            success: true,
            data: {
                coverImage: fileDoc._id
            },
        });
    }
);

const coverImageUploadMiddleware = uploadImage({
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedMimeRegex: /^image\/(png|jpe?g|webp|avif)$/i
});

const createLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createLessonNodeSchema, req);
    const { lessonId } = body;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    lesson.$inc("nodes", 1);

    const lessonNode = await LessonNode.create({
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

const getLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteLessonNodeSchema, req); // Reusing schema as it matches
    const { nodeId } = body;

    const lessonNode = await LessonNode.findById(nodeId).populate("codeId", "name source cssSource jsSource language");
    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    const answers = await QuizAnswer.find({ courseLessonNodeId: lessonNode.id });

    res.json({
        success: true,
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type,
            mode: lessonNode.mode,
            codeId: lessonNode.codeId,
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

const deleteLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteLessonNodeSchema, req);
    const { nodeId } = body;

    const node = await LessonNode.findById(nodeId);
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    await LessonNode.deleteAndCleanup({ _id: nodeId });
    await CourseLesson.updateOne({ _id: node.lessonId }, {
        $inc: { nodes: -1 }
    });
    await LessonNode.updateMany(
        { lessonId: node.lessonId, index: { $gt: node.index } },
        { $inc: { index: -1 } }
    );
    res.json({ success: true });
});

const editLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editLessonNodeSchema, req);
    const { nodeId, type, mode, codeId, text, correctAnswer, answers } = body;

    const node = await LessonNode.findById(nodeId) as any;
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    node._type = type;
    node.mode = mode ?? node.mode;
    node.codeId = codeId ? new mongoose.Types.ObjectId(codeId) : null;
    node.text = text;
    node.correctAnswer = correctAnswer ?? "";

    const currentAnswersIds = (await QuizAnswer.find({ courseLessonNodeId: node.id }).select("_id")).map(x => x._id.toString());

    const answersToDelete = currentAnswersIds.filter(
        answerId => !answers?.some((x: any) => x.id && new mongoose.Types.ObjectId(x.id).toString() === answerId)
    );

    await node.save();
    await QuizAnswer.deleteMany({ _id: { $in: answersToDelete } });

    const updatedAnswers = answers?.map(async (answer: any) => {
        if (answer.id && currentAnswersIds.includes(new mongoose.Types.ObjectId(answer.id).toString())) {
            await QuizAnswer.updateOne(
                { _id: answer.id },
                { text: answer.text, correct: answer.correct }
            );
            return answer;
        } else {
            const result = await QuizAnswer.create({
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

const changeLessonIndex = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(changeLessonIndexSchema, req);
    const { lessonId, newIndex } = body;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    const otherLesson = await CourseLesson.findOne({ course: lesson.course, index: newIndex });
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

const changeLessonNodeIndex = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(changeLessonNodeIndexSchema, req);
    const { nodeId, newIndex } = body;

    const node = await LessonNode.findById(nodeId);
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    const otherNode = await LessonNode.findOne({ lessonId: node.lessonId, index: newIndex });
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

const exportCourseLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(exportCourseLessonSchema, req);

    const { lessonId } = body;

    const data = await exportCourseLessonToJson(lessonId);

    res.json({
        success: true,
        data
    });
});

const uploadLessonImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body, file } = parseWithZod(uploadImageSchema, req);
    const { name, subPath } = body;

    const currentUserId = req.userId!;

    const basePath = "courses/lesson-images";

    const finalPath = subPath
        ? `${basePath}/${subPath}`
        : basePath;

    const fileDoc = await uploadImageToBlob({
        authorId: currentUserId,
        buffer: file.buffer,
        inputMime: file.mimetype,
        path: finalPath,
        name,
        storeOriginal: true
    });

    res.json({
        success: true,
        data: {
            id: fileDoc._id,
            name: fileDoc.name,
            mimetype: fileDoc.mimetype,
            size: fileDoc.size,
            updatedAt: fileDoc.updatedAt,
            url: `/media/files/${fileDoc._id}`,
            previewUrl: fileDoc.preview ? `/media/files/${fileDoc._id}/preview` : null
        }
    });
});

const lessonImageUploadMiddleware = uploadImage({
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedMimeRegex: /^image\/(png|jpe?g|webp|avif)$/i
});

const getLessonImageList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getImageListSchema, req);
    const { subPath } = body;

    const basePath = `courses/lesson-images`;
    const fullPath = subPath
        ? `${basePath}/${subPath}`
        : basePath;

    const items = await listDirectory(fullPath);

    res.json({
        success: true,
        items: items.map((x) => ({
            id: x._id,
            authorId: x.author._id,
            authorName: x.author.name,
            authorAvatar: x.author.avatarImage,
            type: x._type,
            name: x.name,
            mimetype: x.mimetype,
            size: x.size,
            updatedAt: x.updatedAt,
            url: x._type === FileTypeEnum.FILE ? `/media/files/${x._id}` : null,
            previewUrl: (x._type === FileTypeEnum.FILE && x.preview) ? `/media/files/${x._id}/preview` : null
        }))
    });
});

const deleteLessonImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteImageSchema, req);
    const { fileId } = body;

    const fileDoc = await File.findById(fileId).select("author name path").lean();
    if (!fileDoc) {
        res.status(404).json({ error: [{ message: "File not found" }] });
        return;
    }

    const expectedPath = `courses/lesson-images`;
    if (!fileDoc.path.startsWith(expectedPath)) {
        res.status(400).json({ error: [{ message: "Not a lesson image" }] });
        return;
    }

    await deleteEntry(fileDoc.path, fileDoc.name);

    res.json({ success: true });
});

const createLessonImageFolder = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId!;
    const { body } = parseWithZod(createImageFolderSchema, req);
    const { name, subPath } = body;

    const basePath = `courses/lesson-images`;

    const finalPath = subPath
        ? `${basePath}/${subPath}`
        : basePath;

    const folder = await createFolder(currentUserId, finalPath, name);

    res.json({
        success: true,
        data: {
            id: folder._id,
            name: folder.name,
            updatedAt: folder.updatedAt
        }
    });
});

const moveLessonImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(moveImageSchema, req);
    const { fileId, newName, newSubPath } = body;

    const fileDoc = await File.findById(fileId).select("author path name");
    if (!fileDoc) {
        res.status(404).json({ error: [{ message: "File not found" }] });
        return;
    }

    const basePath = `courses/lesson-images`;

    if (!fileDoc.path.startsWith(basePath)) {
        res.status(400).json({ error: [{ message: "Not a lesson image" }] });
        return;
    }

    const targetPath = newSubPath
        ? `${basePath}/${newSubPath}`
        : basePath;

    const targetName = newName ?? fileDoc.name;

    await moveEntry(
        fileDoc.path,
        fileDoc.name,
        targetPath,
        targetName
    );

    res.json({ success: true });
});

const importCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(importCourseSchema, req);
    const { code, title, description, visible, lessons } = body;

    let course = await Course.findOne({ code });

    if (course) {
        course.title = title;
        course.description = description;
        if (visible !== undefined) course.visible = visible;
        await course.save();

        await CourseLesson.deleteAndCleanup({ course: course._id });
    } else {
        course = await Course.create({
            code,
            title,
            description,
            visible: visible ?? false
        });
    }

    for (let i = 0; i < lessons.length; i++) {
        const lessonData = lessons[i];
        try {
            const lesson = await CourseLesson.create({
                course: course._id,
                title: lessonData.title,
                index: i + 1,
                nodes: lessonData.nodes.length
            });

            const nodeDocs = lessonData.nodes.map((node, nodeIndex) => ({
                lessonId: lesson._id,
                index: nodeIndex + 1,
                _type: node.type,
                mode: node.mode,
                codeId: (node.codeId && mongoose.isValidObjectId(node.codeId)) ? new mongoose.Types.ObjectId(node.codeId) : null,
                text: node.text || "",
                correctAnswer: node.correctAnswer
            }));

            if (nodeDocs.length > 0) {
                const createdNodes = await LessonNode.insertMany(nodeDocs);
                const answerDocs: any[] = [];
                for (let j = 0; j < createdNodes.length; j++) {
                    const createdNode = createdNodes[j];
                    const sourceNode = lessonData.nodes[j];

                    if (sourceNode.type === 2 || sourceNode.type === 3) {
                        const answers = (sourceNode as any).answers;
                        if (answers && Array.isArray(answers)) {
                            answers.forEach((ans: any) => {
                                answerDocs.push({
                                    courseLessonNodeId: createdNode._id,
                                    text: ans.text,
                                    correct: ans.correct
                                });
                            });
                        }
                    }
                }

                if (answerDocs.length > 0) {
                    await QuizAnswer.insertMany(answerDocs);
                }
            }
        } catch (error) {
            console.error(`Error importing lesson ${lessonData.title}:`, error);
        }
    }

    res.json({
        success: true,
        message: "Course imported successfully",
        courseId: course._id
    });
});

const exportCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(exportCourseSchema, req);
    const { courseId } = body;

    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    const lessons = await CourseLesson.find({ course: courseId }).sort({ index: 1 });
    const exportedLessons = [];

    for (const lesson of lessons) {
        const nodes = await LessonNode.find({ lessonId: lesson._id }).sort({ index: 1 });
        const exportedNodes = [];

        for (const node of nodes) {
            const exportedNode: any = {
                type: node._type,
                mode: node.mode,
                text: node.text,
                index: node.index,
                codeId: node.codeId ? node.codeId.toString() : null,
                correctAnswer: node.correctAnswer
            };

            if (node._type === 2 || node._type === 3) {
                const answers = await QuizAnswer.find({ courseLessonNodeId: node._id });
                exportedNode.answers = answers.map(ans => ({
                    text: ans.text,
                    correct: ans.correct
                }));
            }

            exportedNodes.push(exportedNode);
        }

        exportedLessons.push({
            title: lesson.title,
            nodes: exportedNodes
        });
    }

    const exportData = {
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        lessons: exportedLessons
    };

    res.json({
        success: true,
        data: exportData
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
    coverImageUploadMiddleware,
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
    exportCourseLesson,
    uploadLessonImage,
    lessonImageUploadMiddleware,
    getLessonImageList,
    deleteLessonImage,
    createLessonImageFolder,
    moveLessonImage,
    importCourse,
    exportCourse
};

export default courseEditorController;