import { z } from "zod";
import { compilerLanguageSchema, dbIdSchema } from "./commonSchema";


export const createOrUpdateSubmissionSchema = z.object({
    body: z.object({
        challengeId: dbIdSchema,
        language: compilerLanguageSchema,
        code: z.string().min(1, "Submission is required")
    })
})


export const submitChallengeJobSchema = z.object({
    body: z.object({
        challengeId: dbIdSchema,
        submissionId: dbIdSchema,
    })
})

export const challengeSubTemplateSchema = z.object({
    body: z.object({
        challengeId: dbIdSchema,
        language: compilerLanguageSchema
    })
})