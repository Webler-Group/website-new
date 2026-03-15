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
    editCourseCssSchema,
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
import {
    CourseResponse,
    deleteCourseAndCleanup,
    deleteCourseLessonAndCleanup,
    deleteLessonNodeAndCleanup,
    EditLessonNodeResponse,
    exportCourseLessonToJson,
    formatCourseMinimal,
    formatLesson,
    formatLessonNodeMinimal,
    LessonNodeResponse,
    LessonProgressInfo,
    LessonResponse,
    QuizAnswerResponse
} from "../helpers/courseHelper";
import { createFolder, deleteEntry, formatFileEntry, listDirectory, moveEntry, uploadImageToBlob } from "../helpers/fileHelper";
import uploadImage from "../middleware/uploadImage";
import File from "../models/File";
import { createImageFolderSchema, deleteImageSchema, getImageListSchema, moveImageSchema, uploadImageSchema } from "../validation/imagesSchema";
import { getImageUrl } from "./mediaController";
import { withTransaction } from "../utils/transaction";
import HttpError from "../exceptions/HttpError";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";

const createCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createCourseSchema, req);
    const { title, description, code } = body;

    const course = await CourseModel.create({ title, description, code, visible: false });

    res.json({
        success: true,
        data: {
            course: {
                id: course._id,
                code: course.code,
                title: course.title,
                visible: course.visible,
                description: course.description
            }
        }
    });
});

const getCoursesList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const result = await CourseModel.find().lean();

    res.json({
        success: true,
        data: {
            courses: result.map(course => formatCourseMinimal(course))
        }
    });
});

const getCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getCourseSchema, req);
    const { courseId, courseCode, includeLessons } = body;

    const course = courseId
        ? await CourseModel.findById(courseId).lean()
        : await CourseModel.findOne({ code: courseCode }).lean();

    if (!course) {
        throw new HttpError("Course not found", 404);
    }

    const courseData: CourseResponse<undefined, LessonProgressInfo> = {
        id: course._id,
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        coverImageUrl: getImageUrl(course.coverImageHash),
        css: course.css,
        userProgress: undefined
    };

    if (includeLessons === true) {
        const lessons = await CourseLessonModel.find({ course: course._id }).sort({ index: "asc" }).lean();
        courseData.lessons = lessons.map(lesson => formatLesson(lesson));
    }

    res.json({ success: true, data: { course: courseData } });
});

const editCourseCss = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editCourseCssSchema, req);
    const { courseId, css } = body;

    const course = await CourseModel.findById(courseId);
    if (!course) {
        throw new HttpError("Course not found", 404);
    }

    course.css = css;
    await course.save();

    res.json({ success: true, data: { courseId: course._id, css: course.css } });
});

const deleteCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteCourseSchema, req);
    const { courseId } = body;

    const course = await CourseModel.findById(courseId).lean();
    if (!course) {
        throw new HttpError("Course not found", 404);
    }

    await withTransaction(async (session) => {
        await deleteCourseAndCleanup(new Types.ObjectId(courseId), session);
    });

    res.json({ success: true });
});

const editCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editCourseSchema, req);
    const { courseId, code, title, description, visible } = body;

    const course = await CourseModel.findById(courseId);
    if (!course) {
        throw new HttpError("Course not found", 404);
    }

    if (code !== course.code) {
        const existingCourse = await CourseModel.exists({ code });
        if (existingCourse) {
            throw new HttpError("Course code already exists", 400);
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
        throw new HttpError("Lesson not found", 404);
    }

    const lessonData: LessonResponse<undefined> = {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes,
        comments: lesson.comments,
        userProgress: undefined,
        nodes: lessonNodes.map(x => formatLessonNodeMinimal(x))
    };

    res.json({ success: true, data: { lesson: lessonData } });
});

const getLessonList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getLessonListSchema, req);
    const { courseId } = body;

    const lessons = await CourseLessonModel.find({ course: courseId }).sort({ index: "asc" }).lean();

    res.json({
        success: true,
        data: {
            lessons: lessons.map((lesson): LessonResponse<undefined> => ({
                id: lesson._id,
                title: lesson.title,
                index: lesson.index,
                nodeCount: lesson.nodes,
                comments: lesson.comments,
                userProgress: undefined
            }))
        }
    });
});

const createLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createLessonSchema, req);
    const { title, courseId } = body;

    const course = await CourseModel.findById(courseId).lean();
    if (!course) {
        throw new HttpError("Course not found", 404);
    }

    const lastLessonIndex = await CourseLessonModel.countDocuments({ course: courseId });
    const lesson = await CourseLessonModel.create({ title, course: courseId, index: lastLessonIndex + 1 });

    res.json({
        success: true,
        data: {
            lesson: {
                id: lesson._id,
                title: lesson.title,
                index: lesson.index
            }
        }
    });
});

const editLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editLessonSchema, req);
    const { lessonId, title } = body;

    const lesson = await CourseLessonModel.findById(lessonId);
    if (!lesson) {
        throw new HttpError("Lesson not found", 404);
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
        throw new HttpError("Lesson not found", 404);
    }

    await withTransaction(async (session) => {
        await deleteCourseLessonAndCleanup({ _id: lessonId }, session);
        await CourseLessonModel.updateMany(
            { course: lesson.course, index: { $gt: lesson.index } },
            { $inc: { index: -1 } },
            { session }
        );
    });

    res.json({ success: true });
});

const uploadCourseCoverImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body, file } = parseWithZod(uploadCourseCoverImageSchema, req);
    const { courseId } = body;
    const currentUserId = req.userId;

    const course = await CourseModel.findById(courseId);
    if (!course) {
        throw new HttpError("Course not found", 404);
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

    const lessonNode = await withTransaction(async (session) => {
        const lesson = await CourseLessonModel.findById(lessonId).session(session);
        if (!lesson) throw new HttpError("Lesson not found", 404);

        const lastNodeIndex = await LessonNodeModel.countDocuments({ lessonId: lesson._id });
        const [lessonNode] = await LessonNodeModel.create([{ lessonId, index: lastNodeIndex + 1 }], { session });

        lesson.nodes = lastNodeIndex + 1;
        await lesson.save({ session });

        return lessonNode;
    });

    res.json({
        success: true,
        data: {
            lessonNode: {
                id: lessonNode._id,
                index: lessonNode.index,
                type: lessonNode._type,
                mode: lessonNode.mode
            }
        }
    });
});

const getLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteLessonNodeSchema, req); // Reusing schema as it matches
    const { nodeId } = body;

    const [lessonNode, answers] = await Promise.all([
        LessonNodeModel.findById(nodeId).lean(),
        QuizAnswerModel.find({ courseLessonNodeId: nodeId }).lean()
    ]);

    if (!lessonNode) {
        throw new HttpError("Lesson node not found", 404);
    }

    const data: LessonNodeResponse = {
        id: lessonNode._id,
        index: lessonNode.index,
        type: lessonNode._type,
        mode: lessonNode.mode ?? 1,
        codeId: lessonNode.codeId,
        text: lessonNode.text ?? "",
        correctAnswer: lessonNode.correctAnswer,
        answers: answers.map((x): QuizAnswerResponse => ({
            id: x._id,
            text: x.text,
            correct: x.correct
        }))
    };

    res.json({ success: true, data: { lessonNode: data } });
});

const deleteLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteLessonNodeSchema, req);
    const { nodeId } = body;

    const node = await LessonNodeModel.findById(nodeId).lean();
    if (!node) {
        throw new HttpError("Lesson node not found", 404);
    }

    await withTransaction(async (session) => {
        await deleteLessonNodeAndCleanup({ _id: nodeId }, session);
        await CourseLessonModel.updateOne(
            { _id: node.lessonId },
            { $inc: { nodes: -1 } },
            { session }
        );
        await LessonNodeModel.updateMany(
            { lessonId: node.lessonId, index: { $gt: node.index } },
            { $inc: { index: -1 } },
            { session }
        );
    });

    res.json({ success: true });
});

const editLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(editLessonNodeSchema, req);
    const { nodeId, type, mode, codeId, text, correctAnswer, answers } = body;

    const data = await withTransaction(async (session) => {
        const node = await LessonNodeModel.findById(nodeId).session(session);
        if (!node) throw new HttpError("Lesson node not found", 404);

        node._type = type;
        node.mode = mode;
        node.codeId = codeId ? new mongoose.Types.ObjectId(codeId) : null;
        node.text = text;
        node.correctAnswer = correctAnswer;
        await node.save({ session });

        const result: EditLessonNodeResponse = {
            id: node._id,
            type: node._type,
            text: node.text || "",
            mode: node.mode,
            correctAnswer: node.correctAnswer,
            codeId: node.codeId
        };

        if (answers) {
            const currentAnswers = await QuizAnswerModel.find(
                { courseLessonNodeId: node.id },
                { _id: 1 }
            ).lean().session(session);

            const currentAnswerIds = currentAnswers.map(a => a._id);
            const idsToDelete = currentAnswerIds.filter(id => !answers.some(a => a.id && id.equals(a.id)));

            await QuizAnswerModel.deleteMany({ _id: { $in: idsToDelete } }, { session });

            const newAnswers: QuizAnswerResponse[] = [];

            for (const newAnswer of answers) {
                if (newAnswer.id && currentAnswerIds.some(id => id.equals(newAnswer.id))) {
                    await QuizAnswerModel.updateOne(
                        { _id: newAnswer.id },
                        { text: newAnswer.text, correct: newAnswer.correct },
                        { session }
                    );
                    newAnswers.push({ id: newAnswer.id, text: newAnswer.text, correct: newAnswer.correct });
                } else {
                    const [created] = await QuizAnswerModel.create([{
                        text: newAnswer.text,
                        correct: newAnswer.correct,
                        courseLessonNodeId: node.id
                    }], { session });
                    newAnswers.push({ id: created._id, text: newAnswer.text, correct: newAnswer.correct });
                }
            }

            result.answers = newAnswers;
        }

        return result;
    });

    res.json({ success: true, data });
});

const changeLessonIndex = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(changeLessonIndexSchema, req);
    const { lessonId, newIndex } = body;

    const result = await withTransaction(async (session) => {
        const lesson = await CourseLessonModel.findById(lessonId).session(session);
        if (!lesson) throw new HttpError("Lesson not found", 404);

        const otherLesson = await CourseLessonModel.findOne({ course: lesson.course, index: newIndex }).session(session);
        if (!otherLesson) throw new HttpError("Invalid lesson index", 400);

        otherLesson.index = lesson.index;
        lesson.index = newIndex;
        await lesson.save({ session });
        await otherLesson.save({ session });

        return { index: newIndex };
    });

    res.json({ success: true, data: result });
});

const changeLessonNodeIndex = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(changeLessonNodeIndexSchema, req);
    const { nodeId, newIndex } = body;

    const result = await withTransaction(async (session) => {
        const node = await LessonNodeModel.findById(nodeId).session(session);
        if (!node) throw new HttpError("Lesson node not found", 404);

        const otherNode = await LessonNodeModel.findOne({ lessonId: node.lessonId, index: newIndex }).session(session);
        if (!otherNode) throw new HttpError("Invalid lesson node index", 400);

        otherNode.index = node.index;
        node.index = newIndex;
        await node.save({ session });
        await otherNode.save({ session });

        return { index: newIndex };
    });

    res.json({ success: true, data: result });
});

const exportCourseLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(exportCourseLessonSchema, req);
    const { lessonId } = body;

    const data = await exportCourseLessonToJson(lessonId);

    res.json({ success: true, data: { lesson: data } });
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
        data: {
            items: items.map(item => formatFileEntry(item))
        }
    });
});

const deleteLessonImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteImageSchema, req);
    const { fileId } = body;

    const fileDoc = await File.findById(fileId).lean();
    if (!fileDoc) {
        throw new HttpError("File not found", 404);
    }

    if (!fileDoc.path.startsWith("courses/lesson-images")) {
        throw new HttpError("Not a lesson image", 400);
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

    const fileDoc = await File.findById(fileId).lean();
    if (!fileDoc) {
        throw new HttpError("File not found", 404);
    }

    const basePath = "courses/lesson-images";
    if (!fileDoc.path.startsWith(basePath)) {
        throw new HttpError("Not a lesson image", 400);
    }

    const targetPath = newSubPath ? `${basePath}/${newSubPath}` : basePath;
    await moveEntry(fileDoc.path, fileDoc.name, targetPath, newName ?? fileDoc.name);

    res.json({ success: true });
});

const importCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(importCourseSchema, req);
    const { code, title, description, visible, lessons } = body;

    const course = await withTransaction(async (session) => {
        let course = await CourseModel.findOne({ code }).session(session);

        if (course) {
            course.title = title;
            course.description = description;
            course.visible = visible;
            await course.save({ session });
            await deleteCourseLessonAndCleanup({ course: course._id }, session);
        } else {
            const [newCourse] = await CourseModel.create(
                [{ code, title, description, visible }],
                { session }
            );
            course = newCourse;
        }

        const createdLessons = await CourseLessonModel.insertMany(
            lessons.map((lessonData, i) => ({
                course: course._id,
                title: lessonData.title,
                index: i + 1,
                nodes: lessonData.nodes.length
            })),
            { session }
        );

        const nodeDocs = lessons.flatMap((lessonData, i) =>
            lessonData.nodes.map((node, nodeIndex) => ({
                lessonId: createdLessons[i]._id,
                index: nodeIndex + 1,
                _type: node.type,
                mode: node.mode,
                codeId: node.codeId,
                text: node.text ?? "",
                correctAnswer: node.correctAnswer
            }))
        );

        if (nodeDocs.length === 0) return course;

        const createdNodes = await LessonNodeModel.insertMany(nodeDocs, { session });

        const answerDocs: Omit<QuizAnswer, "_id">[] = [];
        let nodeOffset = 0;

        for (const lessonData of lessons) {
            for (const node of lessonData.nodes) {
                const createdNode = createdNodes[nodeOffset++];

                if (
                    node.type === LessonNodeTypeEnum.MULTICHOICE_QUESTION ||
                    node.type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION
                ) {
                    node.answers?.forEach(ans => {
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
            await QuizAnswerModel.insertMany(answerDocs, { session });
        }

        return course;
    });

    res.json({
        success: true,
        data: {
            course: {
                id: course._id,
                code: course.code,
                title: course.title,
                visible: course.visible
            }
        }
    });
});

const exportCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(exportCourseSchema, req);
    const { courseId } = body;

    const course = await CourseModel.findById(courseId).lean();
    if (!course) {
        throw new HttpError("Course not found", 404);
    }

    const lessons = await CourseLessonModel.find({ course: courseId }).sort({ index: 1 }).lean();
    const exportedLessons = await Promise.all(lessons.map(async (lesson) => exportCourseLessonToJson(lesson._id)));

    res.json({
        success: true,
        data: {
            course: {
                code: course.code,
                title: course.title,
                description: course.description,
                visible: course.visible,
                lessons: exportedLessons
            }
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
    editCourseCss,
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