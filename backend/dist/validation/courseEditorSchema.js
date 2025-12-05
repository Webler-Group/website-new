"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeLessonNodeIndexSchema = exports.changeLessonIndexSchema = exports.editLessonNodeSchema = exports.deleteLessonNodeSchema = exports.createLessonNodeSchema = exports.uploadCourseCoverImageSchema = exports.deleteLessonSchema = exports.editLessonSchema = exports.createLessonSchema = exports.getLessonListSchema = exports.getLessonSchema = exports.editCourseSchema = exports.deleteCourseSchema = exports.getCourseSchema = exports.createCourseSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
const LessonNodeTypeEnum_1 = __importDefault(require("../data/LessonNodeTypeEnum"));
const quizAnswerSchema = zod_1.z.object({
    id: (0, commonSchema_1.idSchema)("answerId").optional(),
    text: zod_1.z.string().min(1, "Answer text must not be empty").max(120, "Answer text must not exceed 120 characters"),
    correct: zod_1.z.boolean("Correct must be a boolean")
});
exports.createCourseSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: commonSchema_1.titleSchema,
        description: commonSchema_1.courseDescriptionSchema,
        code: commonSchema_1.courseCodeSchema
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
exports.deleteCourseSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: (0, commonSchema_1.idSchema)("courseId")
    })
});
exports.editCourseSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: (0, commonSchema_1.idSchema)("courseId"),
        code: commonSchema_1.courseCodeSchema,
        title: commonSchema_1.titleSchema,
        description: commonSchema_1.courseDescriptionSchema,
        visible: zod_1.z.boolean("Visible must be a boolean")
    })
});
exports.getLessonSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonId: (0, commonSchema_1.idSchema)("lessonId")
    })
});
exports.getLessonListSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: (0, commonSchema_1.idSchema)("courseId")
    })
});
exports.createLessonSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: commonSchema_1.titleSchema,
        courseId: (0, commonSchema_1.idSchema)("courseId")
    })
});
exports.editLessonSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonId: (0, commonSchema_1.idSchema)("lessonId"),
        title: commonSchema_1.titleSchema
    })
});
exports.deleteLessonSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonId: (0, commonSchema_1.idSchema)("lessonId")
    })
});
exports.uploadCourseCoverImageSchema = zod_1.z.object({
    body: zod_1.z.object({
        courseId: (0, commonSchema_1.idSchema)("courseId")
    })
});
exports.createLessonNodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonId: (0, commonSchema_1.idSchema)("lessonId")
    })
});
exports.deleteLessonNodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        nodeId: (0, commonSchema_1.idSchema)("nodeId")
    })
});
exports.editLessonNodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        nodeId: (0, commonSchema_1.idSchema)("nodeId"),
        type: zod_1.z.enum(LessonNodeTypeEnum_1.default),
        text: zod_1.z.string().min(1, "Text must not be empty").max(2000, "Text must not exceed 2000 characters"),
        correctAnswer: zod_1.z.string().max(60, "Correct answer must not exceed 500 characters").optional(),
        answers: zod_1.z.array(quizAnswerSchema).optional()
    })
});
exports.changeLessonIndexSchema = zod_1.z.object({
    body: zod_1.z.object({
        lessonId: (0, commonSchema_1.idSchema)("lessonId"),
        newIndex: zod_1.z.number().int().min(1, "New index must be a positive integer")
    })
});
exports.changeLessonNodeIndexSchema = zod_1.z.object({
    body: zod_1.z.object({
        nodeId: (0, commonSchema_1.idSchema)("nodeId"),
        newIndex: zod_1.z.number().int().min(1, "New index must be a positive integer")
    })
});
