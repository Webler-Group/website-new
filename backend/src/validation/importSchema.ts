import { z } from "zod";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";

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
                text: z.string().optional(),
                correctAnswer: z.string().optional(),
                answers: z.array(z.object({
                    text: z.string().min(1),
                    correct: z.boolean()
                })).optional()
            }))
        }))
    })
});
