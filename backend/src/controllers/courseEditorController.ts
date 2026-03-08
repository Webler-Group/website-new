import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import { Response } from "express";
import CourseModel from "../models/Course";
import CourseLessonModel from "../models/CourseLesson";
import LessonNodeModel from "../models/LessonNode";
import QuizAnswerModel, { QuizAnswer } from "../models/QuizAnswer";
import mongoose, { Types } from "mongoose";
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
import { CourseResponse, deleteCourseAndCleanup, deleteCourseLessonAndCleanup, deleteLessonNodeAndCleanup, exportCourseLessonToJson, formatLesson, LessonNodeResponse } from "../helpers/courseHelper";
import { createFolder, deleteEntry, listDirectory, moveEntry, uploadImageToBlob } from "../helpers/fileHelper";
import uploadImage from "../middleware/uploadImage";
import File from "../models/File";
import { createImageFolderSchema, deleteImageSchema, getImageListSchema, moveImageSchema, uploadImageSchema } from "../validation/imagesSchema";
import FileTypeEnum from "../data/FileTypeEnum";
import { getImageUrl } from "./mediaController";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";

const createCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createCourseSchema, req);
    const { title, description, code } = body;

    const course = await CourseModel.create({ title, description, code, visible: false });

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
    const result = await CourseModel.find().lean();

    res.json({
        success: true,
        courses: result.map(course => ({
            id: course._id,
            code: course.code,
            title: course.title,
            description: course.description,
            visible: course.visible,
            coverImageUrl: getImageUrl(course.coverImageHash)
        }))
    });
});

const getCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCourseSchema, req);
    const { courseId, courseCode, includeLessons } = body;

    const course = courseId
        ? await CourseModel.findById(courseId).lean()
        : await CourseModel.findOne({ code: courseCode }).lean();

    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    const courseData: CourseResponse = {
        id: course._id.toString(),
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        coverImageUrl: getImageUrl(course.coverImageHash)
    };

    if (includeLessons === true) {
        const lessons = await CourseLessonModel.find({ course: course._id }).sort({ index: "asc" }).lean();
        courseData.lessons = lessons.map(lesson => formatLesson(lesson));
    }

    res.json({ success: true, course: courseData });
});

const deleteCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteCourseSchema, req);
    const { courseId } = body;

    const course = await CourseModel.findById(courseId).lean();
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    await deleteCourseAndCleanup(new Types.ObjectId(courseId));
    res.json({ success: true });
});

const editCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editCourseSchema, req);
    const { courseId, code, title, description, visible } = body;

    const course = await CourseModel.findById(courseId);
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    if (code !== course.code) {
        const existingCourse = await CourseModel.exists({ code });
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

    const [lesson, lessonNodes] = await Promise.all([
        CourseLessonModel.findById(lessonId).lean(),
        LessonNodeModel.find({ lessonId }, { _type: 1, index: 1 }).sort({ index: "asc" }).lean()
    ]);

    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    res.json({
        success: true,
        lesson: {
            id: lesson._id,
            title: lesson.title,
            index: lesson.index,
            nodeCount: lesson.nodes,
            nodes: lessonNodes.map(x => ({
                id: x._id,
                index: x.index,
                type: x._type
            }))
        }
    });
});

const getLessonList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonListSchema, req);
    const { courseId } = body;

    const lessons = await CourseLessonModel.find({ course: courseId }).sort({ index: "asc" }).lean();

    res.json({
        success: true,
        lessons: lessons.map(lesson => ({
            id: lesson._id,
            title: lesson.title,
            index: lesson.index,
            nodeCount: lesson.nodes
        }))
    });
});

const createLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createLessonSchema, req);
    const { title, courseId } = body;

    const course = await CourseModel.findById(courseId).lean();
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    const lastLessonIndex = await CourseLessonModel.countDocuments({ course: courseId });

    const lesson = await CourseLessonModel.create({ title, course: courseId, index: lastLessonIndex + 1 });

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

    const lesson = await CourseLessonModel.findById(lessonId);
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

    const lesson = await CourseLessonModel.findById(lessonId).lean();
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    await deleteCourseLessonAndCleanup({ _id: lessonId });
    await CourseLessonModel.updateMany(
        { course: lesson.course, index: { $gt: lesson.index } },
        { $inc: { index: -1 } }
    );

    res.json({ success: true });
});

const uploadCourseCoverImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body, file } = parseWithZod(uploadCourseCoverImageSchema, req);
    const { courseId } = body;
    const currentUserId = req.userId;

    const course = await CourseModel.findById(courseId);
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
        quality: 82
    });

    course.coverImageFileId = fileDoc._id;
    course.coverImageHash = fileDoc.contenthash;
    await course.save();

    res.json({
        success: true,
        data: {
            coverImageFileId: fileDoc._id,
            coverImageUrl: getImageUrl(fileDoc.contenthash)
        }
    });
});

const coverImageUploadMiddleware = uploadImage({
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedMimeRegex: /^image\/(png|jpe?g|webp|avif)$/i
});

const createLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createLessonNodeSchema, req);
    const { lessonId } = body;

    const lesson = await CourseLessonModel.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    lesson.$inc("nodes", 1);

    const lessonNode = await LessonNodeModel.create({ lessonId, index: lesson.nodes });
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

    const [lessonNode, answers] = await Promise.all([
        LessonNodeModel.findById(nodeId)
            .populate("codeId", "name source cssSource jsSource language")
            .lean(),
        QuizAnswerModel.find({ courseLessonNodeId: nodeId }).lean()
    ]);

    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

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

    const node = await LessonNodeModel.findById(nodeId).lean();
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    await deleteLessonNodeAndCleanup({ _id: nodeId });
    await Promise.all([
        CourseLessonModel.updateOne({ _id: node.lessonId }, { $inc: { nodes: -1 } }),
        LessonNodeModel.updateMany({ lessonId: node.lessonId, index: { $gt: node.index } }, { $inc: { index: -1 } })
    ]);

    res.json({ success: true });
});

const editLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editLessonNodeSchema, req);
    const { nodeId, type, mode, codeId, text, correctAnswer, answers } = body;

    const node = await LessonNodeModel.findById(nodeId);
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    node._type = type;
    node.mode = mode ?? node.mode;
    node.codeId = codeId ? new mongoose.Types.ObjectId(codeId) : null;
    node.text = text;
    node.correctAnswer = correctAnswer ?? "";
    await node.save();

    const data: LessonNodeResponse = {
        id: node._id.toString(),
        type: node._type,
        text: node.text || "",
        index: node.index,
        correctAnswer: node.correctAnswer
    };

    if (answers) {
        const currentAnswers = await QuizAnswerModel.find({ courseLessonNodeId: node.id }, { _id: 1 }).lean();
        const currentAnswerIds = currentAnswers.map(a => a._id);

        const idsToDelete = currentAnswerIds.filter(id => !answers.some(a => a.id && id.equals(a.id)));
        await QuizAnswerModel.deleteMany({ _id: { $in: idsToDelete } });

        const newAnswers: { id: string; text: string; correct: boolean }[] = [];

        for (const newAnswer of answers) {
            if (newAnswer.id && currentAnswerIds.some(id => id.equals(newAnswer.id))) {
                await QuizAnswerModel.updateOne(
                    { _id: newAnswer.id },
                    { text: newAnswer.text, correct: newAnswer.correct }
                );
                newAnswers.push({ id: newAnswer.id, text: newAnswer.text, correct: newAnswer.correct });
            } else {
                const result = await QuizAnswerModel.create({
                    text: newAnswer.text,
                    correct: newAnswer.correct,
                    courseLessonNodeId: node.id
                });
                newAnswers.push({ id: result._id.toString(), text: newAnswer.text, correct: newAnswer.correct });
            }
        }

        data.answers = newAnswers;
    }

    res.json({ success: true, data });
});

const changeLessonIndex = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(changeLessonIndexSchema, req);
    const { lessonId, newIndex } = body;

    const lesson = await CourseLessonModel.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }

    const otherLesson = await CourseLessonModel.findOne({ course: lesson.course, index: newIndex });
    if (!otherLesson) {
        res.status(400).json({ error: [{ message: "New index is not valid" }] });
        return;
    }

    otherLesson.index = lesson.index;
    lesson.index = newIndex;
    await Promise.all([lesson.save(), otherLesson.save()]);

    res.json({ success: true, data: { index: newIndex } });
});

const changeLessonNodeIndex = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(changeLessonNodeIndexSchema, req);
    const { nodeId, newIndex } = body;

    const node = await LessonNodeModel.findById(nodeId);
    if (!node) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }

    const otherNode = await LessonNodeModel.findOne({ lessonId: node.lessonId, index: newIndex });
    if (!otherNode) {
        res.status(400).json({ error: [{ message: "New index is not valid" }] });
        return;
    }

    otherNode.index = node.index;
    node.index = newIndex;
    await Promise.all([node.save(), otherNode.save()]);

    res.json({ success: true, data: { index: newIndex } });
});

const exportCourseLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(exportCourseLessonSchema, req);
    const { lessonId } = body;

    const data = await exportCourseLessonToJson(new Types.ObjectId(lessonId));

    res.json({ success: true, data });
});

const uploadLessonImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body, file } = parseWithZod(uploadImageSchema, req);
    const { name, subPath } = body;
    const currentUserId = req.userId!;

    const basePath = "courses/lesson-images";
    const finalPath = subPath ? `${basePath}/${subPath}` : basePath;

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
            url: getImageUrl(fileDoc.contenthash),
            previewUrl: fileDoc.preview ? `/media/files/${fileDoc.contenthash}/preview` : null
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

    const basePath = "courses/lesson-images";
    const fullPath = subPath ? `${basePath}/${subPath}` : basePath;

    const items = await listDirectory(fullPath);

    res.json({
        success: true,
        items: items.map(x => ({
            id: x._id,
            authorId: x.author._id,
            authorName: x.author.name,
            authorAvatarUrl: getImageUrl(x.author.avatarHash),
            type: x._type,
            name: x.name,
            mimetype: x.mimetype,
            size: x.size,
            updatedAt: x.updatedAt,
            url: getImageUrl(x.contenthash),
            previewUrl: x._type === FileTypeEnum.FILE && x.preview ? `/media/files/${x.contenthash}/preview` : null
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

    if (!fileDoc.path.startsWith("courses/lesson-images")) {
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

    const basePath = "courses/lesson-images";
    const finalPath = subPath ? `${basePath}/${subPath}` : basePath;

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

    const fileDoc = await File.findById(fileId).select("author path name").lean();
    if (!fileDoc) {
        res.status(404).json({ error: [{ message: "File not found" }] });
        return;
    }

    const basePath = "courses/lesson-images";
    if (!fileDoc.path.startsWith(basePath)) {
        res.status(400).json({ error: [{ message: "Not a lesson image" }] });
        return;
    }

    const targetPath = newSubPath ? `${basePath}/${newSubPath}` : basePath;
    await moveEntry(fileDoc.path, fileDoc.name, targetPath, newName ?? fileDoc.name);

    res.json({ success: true });
});

const importCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(importCourseSchema, req);
    const { code, title, description, visible, lessons } = body;

    const session = await mongoose.startSession();

    const course = await session.withTransaction(async () => {
        let course = await CourseModel.findOne({ code }).session(session);

        if (course) {
            course.title = title;
            course.description = description;
            if (visible !== undefined) course.visible = visible;
            await course.save({ session });
            await deleteCourseLessonAndCleanup({ course: course._id }, session);
        } else {
            const [newCourse] = await CourseModel.create([{ code, title, description, visible: visible ?? false }], { session });
            course = newCourse;
        }

        for (let i = 0; i < lessons.length; i++) {
            const lessonData = lessons[i];

            const [lesson] = await CourseLessonModel.create([{
                course: course._id,
                title: lessonData.title,
                index: i + 1,
                nodes: lessonData.nodes.length
            }], { session });

            const nodeDocs = lessonData.nodes.map((node, nodeIndex) => ({
                lessonId: lesson._id,
                index: nodeIndex + 1,
                _type: node.type,
                mode: node.mode,
                codeId: node.codeId,
                text: node.text || "",
                correctAnswer: node.correctAnswer
            }));

            if (nodeDocs.length > 0) {
                const createdNodes = await LessonNodeModel.insertMany(nodeDocs, { session });
                const answerDocs: Omit<QuizAnswer, "_id">[] = [];

                for (let j = 0; j < createdNodes.length; j++) {
                    const createdNode = createdNodes[j];
                    const sourceNode = lessonData.nodes[j];

                    if (
                        sourceNode.type === LessonNodeTypeEnum.MULTICHOICE_QUESTION ||
                        sourceNode.type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION
                    ) {
                        sourceNode.answers?.forEach(ans => {
                            answerDocs.push({
                                courseLessonNodeId: createdNode._id,
                                text: ans.text,
                                correct: ans.correct
                            });
                        });
                    }
                }

                if (answerDocs.length > 0) {
                    await QuizAnswerModel.insertMany(answerDocs, { session });
                }
            }
        }

        return course;
    });

    await session.endSession();

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

const exportCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(exportCourseSchema, req);
    const { courseId } = body;

    const course = await CourseModel.findById(courseId).lean();
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }

    const lessons = await CourseLessonModel.find({ course: courseId }).sort({ index: 1 }).lean();

    const exportedLessons = await Promise.all(lessons.map(async lesson => {
        const nodes = await LessonNodeModel.find({ lessonId: lesson._id }).sort({ index: 1 }).lean();

        const exportedNodes = await Promise.all(nodes.map(async node => {
            type ExportedNode = {
                type: LessonNodeTypeEnum;
                mode: number | undefined;
                text: string | undefined;
                index: number;
                codeId: string | null;
                correctAnswer: string | undefined;
                answers?: { text: string; correct: boolean }[];
            };

            const exportedNode: ExportedNode = {
                type: node._type,
                mode: node.mode,
                text: node.text,
                index: node.index,
                codeId: node.codeId ? node.codeId.toString() : null,
                correctAnswer: node.correctAnswer
            };

            if (
                node._type === LessonNodeTypeEnum.MULTICHOICE_QUESTION ||
                node._type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION
            ) {
                const answers = await QuizAnswerModel.find({ courseLessonNodeId: node._id }).lean();
                exportedNode.answers = answers.map(ans => ({ text: ans.text, correct: ans.correct }));
            }

            return exportedNode;
        }));

        return { title: lesson.title, nodes: exportedNodes };
    }));

    res.json({
        success: true,
        data: {
            code: course.code,
            title: course.title,
            description: course.description,
            visible: course.visible,
            lessons: exportedLessons
        }
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