"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLessonCommentSchema = exports.editLessonCommentSchema = exports.createLessonCommentSchema = exports.getLessonCommentsSchema = exports.resetCourseProgressSchema = exports.solveSchema = exports.getLessonNodeSchema = exports.getLessonSchema = exports.getCourseSchema = exports.getUserCourseListSchema = exports.getCourseListSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
const quizAnswerSchema = zod_1.z.object({
    id: (0, commonSchema_1.idSchema)("answerId"),
    correct: zod_1.z.boolean("Correct must be a boolean")
});
exports.getCourseListSchema = zod_1.z.object({
    body: zod_1.z.object({
        excludeUserId: (0, commonSchema_1.idSchema)("excludeUserId").optional()
    })
});
exports.getUserCourseListSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId")
    })
});
exports.getCourseSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: (0, commonSchema_1.idSchema)("courseId").optional(),
        courseCode: commonSchema_1.courseCodeSchema.optional(),
        includeLessons: zod_1.z.boolean().optional()
    }).refine(data => data.courseId || data.courseCode, {
        message: "Either courseId or courseCode must be provided",
        path: ["courseId", "courseCode"]
    })
});
exports.getLessonSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonId: (0, commonSchema_1.idSchema)("lessonId")
    })
});
exports.getLessonNodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        nodeId: (0, commonSchema_1.idSchema)("nodeId"),
        mock: zod_1.z.boolean().optional()
    })
});
exports.solveSchema = zod_1.z.object({
    body: zod_1.z.object({
        nodeId: (0, commonSchema_1.idSchema)("nodeId"),
        correctAnswer: zod_1.z.string().optional(),
        answers: zod_1.z.array(quizAnswerSchema).optional(),
        mock: zod_1.z.boolean().optional()
    })
});
exports.resetCourseProgressSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: (0, commonSchema_1.idSchema)("courseId")
    })
});
exports.getLessonCommentsSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonId: (0, commonSchema_1.idSchema)("lessonId"),
        parentId: (0, commonSchema_1.idSchema)("parentId").nullish(),
        index: commonSchema_1.indexSchema,
        count: commonSchema_1.countPerPageSchema,
        filter: (0, commonSchema_1.filterSchema)([1, 2, 3]),
        findPostId: (0, commonSchema_1.idSchema)("findPostId").nullish()
    })
});
exports.createLessonCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonId: (0, commonSchema_1.idSchema)("lessonId"),
        message: commonSchema_1.commentMessageSchema,
        parentId: (0, commonSchema_1.idSchema)("parentId").nullish()
    })
});
exports.editLessonCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        id: (0, commonSchema_1.idSchema)("id"),
        message: commonSchema_1.commentMessageSchema
    })
});
exports.deleteLessonCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        id: (0, commonSchema_1.idSchema)("id")
    })
});
