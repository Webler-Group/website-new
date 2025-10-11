"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChallengeJobSchema = exports.createChallengeJobSchema = exports.saveChallengeCodeSchema = exports.getChallengeCodeSchema = exports.getChallengeListSchema = exports.getChallengeSchema = exports.editChallengeSchema = exports.createChallengeSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
const ChallengeDifficultyEnum_1 = __importDefault(require("../data/ChallengeDifficultyEnum"));
const difficultySchema = zod_1.z.enum(ChallengeDifficultyEnum_1.default, "Invalid difficulty");
const testCaseSchema = zod_1.z.object({
    input: zod_1.z.string(),
    expectedOutput: zod_1.z.string().min(1, "Expected output is required"),
    isHidden: zod_1.z.boolean(),
});
const templateSchema = zod_1.z.object({
    name: commonSchema_1.compilerLanguageSchema,
    source: zod_1.z.string().min(1, "Template source is required"),
});
exports.createChallengeSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: commonSchema_1.questionTitleSchema,
        description: commonSchema_1.messageSchema,
        difficulty: difficultySchema,
        testCases: zod_1.z.array(testCaseSchema).min(1, "At least one test case is required").max(50, "At most 50 test cases is allowed"),
        templates: zod_1.z.array(templateSchema)
    })
});
exports.editChallengeSchema = exports.createChallengeSchema.extend({
    body: zod_1.z.object({
        challengeId: (0, commonSchema_1.idSchema)("challengeId"),
        title: commonSchema_1.questionTitleSchema,
        description: commonSchema_1.messageSchema,
        difficulty: difficultySchema,
        testCases: zod_1.z.array(testCaseSchema).min(1, "At least one test case is required"),
        templates: zod_1.z.array(templateSchema)
    })
});
exports.getChallengeSchema = zod_1.z.object({
    body: zod_1.z.object({
        challengeId: (0, commonSchema_1.idSchema)("challengeId")
    }),
});
exports.getChallengeListSchema = zod_1.z.object({
    body: zod_1.z.object({
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema,
        difficulty: difficultySchema.nullish(),
        // status: z.enum(["solved", "unsolved"]).nullish(),
        searchQuery: zod_1.z.string().optional(),
    })
});
exports.getChallengeCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        challengeId: (0, commonSchema_1.idSchema)("challengeId"),
        language: commonSchema_1.compilerLanguageSchema
    })
});
exports.saveChallengeCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        language: commonSchema_1.compilerLanguageSchema,
        challengeId: (0, commonSchema_1.idSchema)("challengeId"),
        source: zod_1.z.string()
    })
});
exports.createChallengeJobSchema = zod_1.z.object({
    body: zod_1.z.object({
        challengeId: (0, commonSchema_1.idSchema)("challengeId"),
        language: commonSchema_1.compilerLanguageSchema,
        source: zod_1.z.string()
    })
});
exports.getChallengeJobSchema = zod_1.z.object({
    body: zod_1.z.object({
        jobId: (0, commonSchema_1.idSchema)("jobId")
    })
});
