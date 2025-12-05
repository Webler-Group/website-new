import { z } from "zod";
import { commentMessageSchema, countPerPageSchema, courseCodeSchema, filterSchema, idSchema, indexSchema } from "./commonSchema";

const quizAnswerSchema = z.object({
    id: idSchema("answerId"),
    correct: z.boolean("Correct must be a boolean")
});

export const getCourseListSchema = z.object({
    body: z.object({
        excludeUserId: idSchema("excludeUserId").optional()
    })
});

export const getUserCourseListSchema = z.object({
    body: z.object({
        userId: idSchema("userId")
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

export const getLessonSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId")
    })
});

export const getLessonNodeSchema = z.object({
    body: z.object({
        nodeId: idSchema("nodeId"),
        mock: z.boolean().optional()
    })
});

export const solveSchema = z.object({
    body: z.object({
        nodeId: idSchema("nodeId"),
        correctAnswer: z.string().optional(),
        answers: z.array(quizAnswerSchema).optional(),
        mock: z.boolean().optional()
    })
});

export const resetCourseProgressSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId")
    })
});

export const getLessonCommentsSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId"),
        parentId: idSchema("parentId").nullish(),
        index: indexSchema,
        count: countPerPageSchema,
        filter: filterSchema([1, 2, 3]),
        findPostId: idSchema("findPostId").nullish()
    })
});

export const createLessonCommentSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId"),
        message: commentMessageSchema,
        parentId: idSchema("parentId").nullish()
    })
});

export const editLessonCommentSchema = z.object({
    body: z.object({
        id: idSchema("id"),
        message: commentMessageSchema
    })
});

export const deleteLessonCommentSchema = z.object({
    body: z.object({
        id: idSchema("id")
    })
});