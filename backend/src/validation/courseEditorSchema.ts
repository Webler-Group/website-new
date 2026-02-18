import { z } from "zod";
import { countPerPageSchema, courseCodeSchema, courseDescriptionSchema, fileNameSchema, idSchema, multerFileSchema, pageSchema, titleSchema } from "./commonSchema";
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
        type: z.nativeEnum(LessonNodeTypeEnum),
        mode: z.nativeEnum(LessonNodeModeEnum).optional(),
        codeId: z.string().nullable().optional(),
        text: z.string().min(1, "Text must not be empty").max(8000, "Text must not exceed 8000 characters"),
        correctAnswer: z.string().max(8000, "Correct answer must not exceed 8000 characters").nullable().optional(),
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

export const uploadLessonImageSchema = z.object({
    body: z.object({
        name: fileNameSchema
    }),
    file: multerFileSchema
});

export const getLessonImageListSchema = z.object({
    body: z.object({
        page: pageSchema,
        count: countPerPageSchema
    }),
});

export const deleteLessonImageSchema = z.object({
    body: z.object({
        fileId: idSchema("fileId")
    })
})