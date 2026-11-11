import { z } from "zod";
import { compilerLanguageSchema, countPerPageSchema, filterSchema, idSchema, multerFileSchema, pageSchema, questionTitleSchema, tagNameSchema } from "./commonSchema";
import ChallengeDifficultyEnum from "../data/ChallengeDifficultyEnum";

export const challengeDescriptionSchema = z.string().min(1, "Description is required").max(8192, "Description cannot exceed 8192 characters");

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

const challengeTagsSchema = z.array(tagNameSchema).max(10, "Maximum 10 tags allowed").optional();

export const createChallengeSchema = z.object({
  body: z.object({
    title: questionTitleSchema,
    description: challengeDescriptionSchema,
    difficulty: difficultySchema,
    testCases: z.array(testCaseSchema).min(1, "At least one test case is required"),
    templates: z.array(templateSchema),
    xp: z.number(),
    isVisible: z.number(),
    solution: z.string().optional(),
    tags: challengeTagsSchema
  })
});

export const editChallengeSchema = createChallengeSchema.extend({
  body: z.object({
    challengeId: idSchema("challengeId"),
    title: questionTitleSchema,
    description: challengeDescriptionSchema,
    difficulty: difficultySchema,
    testCases: z.array(testCaseSchema).min(1, "At least one test case is required"),
    templates: z.array(templateSchema),
    xp: z.number(),
    isVisible: z.number(),
    solution: z.string().optional(),
    tags: challengeTagsSchema
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
    userId: idSchema("userId").nullish(),
    filter: filterSchema([1, 2, 3]),
    searchQuery: z.string().optional(),
    tag: tagNameSchema.nullish(),
    isVisible: z.number()
  })
});

export const importChallengesSchema = z.object({
  body: z.object({
    dryRun: z.enum(["0", "1"]).default("1")
  }),
  file: multerFileSchema
});

export const getChallengeCollectionSchema = z.object({
  body: z.object({
    collectionId: idSchema("collectionId")
  })
});

const collectionSectionSchema = z.object({
  title: z.string().trim().min(1, "Section title is required").max(120, "Section title cannot exceed 120 characters"),
  description: z.string().trim().max(1000, "Section description cannot exceed 1000 characters"),
  challenges: z.array(idSchema("challengeId")).max(500, "A section can hold at most 500 challenges")
});

const collectionFields = {
  title: z.string().trim().min(1, "Title is required").max(120, "Title cannot exceed 120 characters"),
  description: z.string().trim().max(4096, "Description cannot exceed 4096 characters"),
  isPublic: z.boolean(),
  sections: z.array(collectionSectionSchema).max(100, "A collection can have at most 100 sections")
};

export const createChallengeCollectionSchema = z.object({
  body: z.object(collectionFields)
});

export const editChallengeCollectionSchema = z.object({
  body: z.object({ collectionId: idSchema("collectionId"), ...collectionFields })
});

export const deleteChallengeCollectionSchema = getChallengeCollectionSchema;

export const getChallengeTagsSchema = z.object({
  body: z.object({
    isVisible: z.number()
  })
});

export const searchChallengesSchema = z.object({
  body: z.object({
    query: z.string().trim().max(120)
  })
});

export const getChallengeCodeSchema = z.object({
  body: z.object({
    challengeId: idSchema("challengeId"),
    language: compilerLanguageSchema
  })
});

export const saveChallengeCodeSchema = z.object({
  body: z.object({
    language: compilerLanguageSchema,
    challengeId: idSchema("challengeId"),
    source: z.string().min(1, "Source code is required"),
    title: z.string().min(1, "Title is required"),
  })
});

export const createChallengeJobSchema = z.object({
  body: z.object({
    challengeId: idSchema("challengeId"),
    language: compilerLanguageSchema,
    source: z.string().min(1, "Source code is required")
  })
});

export const getChallengeJobSchema = z.object({
  body: z.object({
    jobId: z.uuid("jobId: Invalid job ID")
  })
});

export const unlockChallengeSolutionSchema = z.object({
  body: z.object({
    challengeId: idSchema("challengeId")
  }),
});