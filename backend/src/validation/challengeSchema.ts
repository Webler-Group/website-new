import { z } from "zod";
import { compilerLanguageSchema, countPerPageSchema, idSchema, messageSchema, pageSchema, questionTitleSchema } from "./commonSchema";
import ChallengeDifficultyEnum from "../data/ChallengeDifficultyEnum";

const difficultySchema = z.enum(ChallengeDifficultyEnum, "Invalid difficulty");

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
    testCases: z.array(testCaseSchema).min(1, "At least one test case is required"),
    templates: z.array(templateSchema).min(1, "At least one template is required")
  })
});

export const editChallengeSchema = createChallengeSchema.extend({
  body: z.object({
    challengeId: idSchema("challengeId"), 
    title: questionTitleSchema,
    description: messageSchema,
    difficulty: difficultySchema,
    testCases: z.array(testCaseSchema).min(1, "At least one test case is required"),
    templates: z.array(templateSchema).min(1, "At least one template is required")
  })
});

export const getChallengeSchema = z.object({
  body: z.object({
    challengeId: idSchema("challengeId")
  }),
});

export const getChallengeListSchema = z.object({
  body: z.object({
    page: pageSchema,
    count: countPerPageSchema,
    difficulty: difficultySchema.nullish(),
    status: z.enum(["solved", "unsolved"]).nullish(),
    searchQuery: z.string().optional(),
  })
});
