import { z } from "zod";
import { countPerPageSchema, courseCodeSchema, courseDescriptionSchema, idSchema, multerFileSchema, pageSchema, titleSchema } from "./commonSchema";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../data/LessonNodeModeEnum";

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
    }),
    file: multerFileSchema
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
        type: z.enum(LessonNodeTypeEnum, "Invalid lesson node type"),
        mode: z.enum(LessonNodeModeEnum, "Invalid lesson node mode").optional(),
        codeId: z.string().nullable().optional(),
        text: z.string().max(8000, "Text must not exceed 8000 characters").optional(),
        correctAnswer: z.string().max(80, "Correct answer must not exceed 80 characters").nullable().optional(),
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

export const exportCourseLessonSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId")
    })
});

export const generateLessonNodeSchema = z.object({
    body: z.object({
        nodeId: idSchema("nodeId"),
        type: z.enum(LessonNodeTypeEnum),
        description: z.string().max(256).nullish()
    })
});

export const exportCourseSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId")
    })
});

export const importCourseSchema = z.object({
    body: z.object({
        code: z.string().min(1).max(64).regex(/^([a-z0-9]+-)*[a-z0-9]+$/),
        title: z.string().min(1).max(120),
        description: z.string().min(1).max(1000),
        visible: z.boolean().optional(),
        lessons: z.array(z.object({
            title: z.string().min(1).max(120),
            nodes: z.array(z.object({
                type: z.enum(LessonNodeTypeEnum, "Invalid lesson node type"),
                mode: z.enum(LessonNodeModeEnum, "Invalid lesson node mode").optional(),
                codeId: z.string().nullable().optional(),
                text: z.string().min(0).max(8000).optional(),
                correctAnswer: z.string().max(8000).nullable().optional(),
                answers: z.array(z.object({
                    text: z.string().min(1).max(120),
                    correct: z.boolean()
                })).optional()
            }))
        }))
    })
});
