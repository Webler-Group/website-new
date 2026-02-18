import { z } from "zod";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../data/LessonNodeModeEnum";

export const importCourseSchema = z.object({
    body: z.object({
        code: z.string().min(1).max(64).regex(/^([a-z0-9]+-)*[a-z0-9]+$/),
        title: z.string().min(1).max(120),
        description: z.string().min(1).max(1000),
        visible: z.boolean().optional(),
        lessons: z.array(z.object({
            title: z.string().min(1).max(120),
            nodes: z.array(z.object({
                type: z.nativeEnum(LessonNodeTypeEnum),
                mode: z.nativeEnum(LessonNodeModeEnum).optional(),
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
