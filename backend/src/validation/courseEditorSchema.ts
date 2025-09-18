import { z } from "zod";
import { courseCodeSchema, courseDescriptionSchema, idSchema, titleSchema } from "./commonSchema";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";

const quizAnswerSchema = z.object({
    id: idSchema("answerId").optional(),
    text: z.string().min(1, "Answer text must not be empty").max(120, "Answer text must not exceed 120 characters"),
    correct: z.boolean("Correct must be a boolean")
});

export const createCourseSchema = z.object({
    body: z.object({
        title: titleSchema,
        description: courseDescriptionSchema,
        code: courseCodeSchema
    })
});

export const getCourseSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId").optional(),
        courseCode: courseCodeSchema.optional(),
        includeLessons: z.boolean().optional()
    }).refine(data => data.courseId || data.courseCode, {
        message: "Either courseId or courseCode must be provided",
        path: ["courseId", "courseCode"]
    })
});

export const deleteCourseSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId")
    })
});

export const editCourseSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId"),
        code: courseCodeSchema,
        title: titleSchema,
        description: courseDescriptionSchema,
        visible: z.boolean("Visible must be a boolean")
    })
});

export const getLessonSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId")
    })
});

export const getLessonListSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId")
    })
});

export const createLessonSchema = z.object({
    body: z.object({
        title: titleSchema,
        courseId: idSchema("courseId")
    })
});

export const editLessonSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId"),
        title: titleSchema
    })
});

export const deleteLessonSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId")
    })
});

export const uploadCourseCoverImageSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId")
    })
});

export const createLessonNodeSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId")
    })
});

export const deleteLessonNodeSchema = z.object({
    body: z.object({
        nodeId: idSchema("nodeId")
    })
});

export const editLessonNodeSchema = z.object({
    body: z.object({
        nodeId: idSchema("nodeId"),
        type: z.enum(LessonNodeTypeEnum),
        text: z.string().min(1, "Text must not be empty").max(2000, "Text must not exceed 2000 characters"),
        correctAnswer: z.string().max(500, "Correct answer must not exceed 500 characters").optional(),
        answers: z.array(quizAnswerSchema).optional()
    })
});

export const changeLessonIndexSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId"),
        newIndex: z.number().int().min(1, "New index must be a positive integer")
    })
});

export const changeLessonNodeIndexSchema = z.object({
    body: z.object({
        nodeId: idSchema("nodeId"),
        newIndex: z.number().int().min(1, "New index must be a positive integer")
    })
});