import { z } from "zod";
import { compilerLanguageSchema, dbIdSchema, messageSchema, questionTitleSchema, xpSchema } from "./commonSchema";

const difficultySchema = z.enum(["easy", "medium", "hard"]);

const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string().min(1, "Expected output is required"),
  isHidden: z.boolean(),
});

const templateSchema = z.object({
  name: compilerLanguageSchema,
  source: z.string().min(1, "Template source is required"),
});

export const createChallengeSchema = z.object({
    body: z.object({
        title: questionTitleSchema,
        description: messageSchema,
        difficulty: difficultySchema,
        xp: xpSchema,
        testCases: z.array(testCaseSchema).min(1, "At least one test case is required"),
        templates: z.array(templateSchema).min(1, "At least one template is required")
    })
});

export const editChallengeSchema = createChallengeSchema.extend({
  body: z.object({
    challengeId: dbIdSchema
  }),
});

export const getChallengeSchema = z.object({
  body: z.object({
    challengeId: dbIdSchema
  }),
});

export const getChallengeListSchema = z.object({
  body: z.object({
    page: z.number().int().min(1),
    count: z.number().int().min(1).max(100),
    filter: z.number().optional(),
    searchQuery: z.string().optional(),
  })
});
