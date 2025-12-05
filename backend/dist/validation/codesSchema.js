"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobSchema = exports.createJobSchema = exports.deleteCodeCommentSchema = exports.editCodeCommentSchema = exports.createCodeCommentSchema = exports.getCodeCommentsSchema = exports.voteCodeSchema = exports.deleteCodeSchema = exports.editCodeSchema = exports.getTemplateSchema = exports.getCodeSchema = exports.getCodeListSchema = exports.createCodeSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
exports.createCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: commonSchema_1.titleSchema,
        language: commonSchema_1.compilerLanguageSchema,
        source: zod_1.z.string(),
        cssSource: zod_1.z.string(),
        jsSource: zod_1.z.string()
    })
});
exports.getCodeListSchema = zod_1.z.object({
    body: zod_1.z.object({
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema,
        filter: (0, commonSchema_1.filterSchema)([1, 2, 3, 5]),
        searchQuery: commonSchema_1.searchQuerySchema,
        userId: (0, commonSchema_1.idSchema)("userId").nullish(),
        language: commonSchema_1.compilerLanguageSchema.nullish()
    })
});
exports.getCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        codeId: (0, commonSchema_1.idSchema)("codeId")
    })
});
exports.getTemplateSchema = zod_1.z.object({
    params: zod_1.z.object({
        language: commonSchema_1.compilerLanguageSchema
    })
});
exports.editCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        codeId: (0, commonSchema_1.idSchema)("codeId"),
        name: commonSchema_1.titleSchema,
        isPublic: zod_1.z.boolean("isPublic must be a boolean"),
        source: zod_1.z.string(),
        cssSource: zod_1.z.string(),
        jsSource: zod_1.z.string()
    })
});
exports.deleteCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        codeId: (0, commonSchema_1.idSchema)("codeId")
    })
});
exports.voteCodeSchema = zod_1.z.object({
    body: zod_1.z.object({
        codeId: (0, commonSchema_1.idSchema)("codeId"),
        vote: commonSchema_1.voteSchema
    })
});
exports.getCodeCommentsSchema = zod_1.z.object({
    body: zod_1.z.object({
        codeId: (0, commonSchema_1.idSchema)("codeId"),
        parentId: (0, commonSchema_1.idSchema)("parentId").nullish(),
        index: commonSchema_1.indexSchema,
        count: commonSchema_1.countPerPageSchema,
        filter: (0, commonSchema_1.filterSchema)([1, 2, 3]),
        findPostId: (0, commonSchema_1.idSchema)("findPostId").nullish()
    })
});
exports.createCodeCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        codeId: (0, commonSchema_1.idSchema)("codeId"),
        message: commonSchema_1.commentMessageSchema,
        parentId: (0, commonSchema_1.idSchema)("parentId").nullish()
    })
});
exports.editCodeCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        id: (0, commonSchema_1.idSchema)("id"),
        message: commonSchema_1.commentMessageSchema
    })
});
exports.deleteCodeCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        id: (0, commonSchema_1.idSchema)("id")
    })
});
exports.createJobSchema = zod_1.z.object({
    body: zod_1.z.object({
        language: commonSchema_1.compilerLanguageSchema,
        source: zod_1.z.string(),
        stdin: zod_1.z.string().optional()
    })
});
exports.getJobSchema = zod_1.z.object({
    body: zod_1.z.object({
        jobId: (0, commonSchema_1.idSchema)("jobId")
    })
});
