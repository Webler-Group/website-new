import { z } from "zod";
import { courseCodeSchema, courseDescriptionSchema, idSchema, indexSchema, multerFileSchema, pageSchema, titleSchema } from "./commonSchema";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../data/LessonNodeModeEnum";

const nodeCorrectAnswerSchema = z.string().max(80, "Correct answer must not exceed 80 characters");
const nodeTextSchema = z.string().max(8000, "Text must not exceed 8000 characters");

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
        mode: z.enum(LessonNodeModeEnum, "Invalid lesson node mode"),
        codeId: z.string().nullable().optional(),
        text: nodeTextSchema.optional(),
        correctAnswer: nodeCorrectAnswerSchema.optional(),
        answers: z.array(quizAnswerSchema).optional()
    })
});

export const changeLessonIndexSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId"),
        newIndex: indexSchema
    })
});

export const changeLessonNodeIndexSchema = z.object({
    body: z.object({
        nodeId: idSchema("nodeId"),
        newIndex: indexSchema
    })
});

export const exportCourseLessonSchema = z.object({
    body: z.object({
        lessonId: idSchema("lessonId")
    })
});

export const editCourseCssSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId"),
        css: z.string()
    })
});

export const exportCourseSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId")
    })
});

export const importCourseSchema = z.object({
    body: z.object({
        code: courseCodeSchema,
        title: titleSchema,
        description: courseDescriptionSchema,
        visible: z.boolean("Visible must be a boolean"),
        css: z.string().optional(),
        lessons: z.array(z.object({
            version: z.number(),
            title: titleSchema,
            nodes: z.array(z.object({
                version: z.number(),
                index: indexSchema,
                type: z.enum(LessonNodeTypeEnum, "Invalid lesson node type"),
                mode: z.enum(LessonNodeModeEnum, "Invalid lesson node mode").optional(),
                codeId: idSchema("codeId").nullable().optional(),
                text: nodeTextSchema.optional(),
                correctAnswer: nodeCorrectAnswerSchema.optional(),
                answers: z.array(quizAnswerSchema).optional()
            }))
        }))
    })
});
