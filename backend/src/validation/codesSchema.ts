import { z } from "zod";
import { idSchema, pageSchema, countPerPageSchema, searchQuerySchema, messageSchema, indexSchema, filterSchema, titleSchema, compilerLanguageSchema, voteSchema } from "./commonSchema";

export const createCodeSchema = z.object({
    body: z.object({
        name: titleSchema,
        language: compilerLanguageSchema,
        source: z.string(),
        cssSource: z.string(),
        jsSource: z.string()
    })
});

export const getCodeListSchema = z.object({
    body: z.object({
        page: pageSchema,
        count: countPerPageSchema,
        filter: filterSchema([1, 2, 3, 5]),
        searchQuery: searchQuerySchema,
        userId: z.union([idSchema("userId"), z.null()]).optional(),
        language: z.union([compilerLanguageSchema, z.null()]).optional()
    })
});

export const getCodeSchema = z.object({
    body: z.object({
        codeId: idSchema("codeId")
    })
});

export const getTemplateSchema = z.object({
    params: z.object({
        language: compilerLanguageSchema
    })
});

export const editCodeSchema = z.object({
    body: z.object({
        codeId: idSchema("codeId"),
        name: titleSchema,
        isPublic: z.boolean("isPublic must be a boolean"),
        source: z.string(),
        cssSource: z.string(),
        jsSource: z.string()
    })
});

export const deleteCodeSchema = z.object({
    body: z.object({
        codeId: idSchema("codeId")
    })
});

export const voteCodeSchema = z.object({
    body: z.object({
        codeId: idSchema("codeId"),
        vote: voteSchema
    })
});

export const getCodeCommentsSchema = z.object({
    body: z.object({
        codeId: idSchema("codeId"),
        parentId: idSchema("parentId").nullish(),
        index: indexSchema,
        count: countPerPageSchema,
        filter: filterSchema([1, 2, 3]),
        findPostId: idSchema("findPostId").nullish()
    })
});

export const createCodeCommentSchema = z.object({
    body: z.object({
        codeId: idSchema("codeId"),
        message: messageSchema,
        parentId: idSchema("parentId").nullish()
    })
});

export const editCodeCommentSchema = z.object({
    body: z.object({
        id: idSchema("id"),
        message: messageSchema
    })
});

export const deleteCodeCommentSchema = z.object({
    body: z.object({
        id: idSchema("id")
    })
});

export const createJobSchema = z.object({
    body: z.object({
        language: compilerLanguageSchema,
        source: z.string(),
        stdin: z.string().optional()
    })
});

export const getJobSchema = z.object({
    body: z.object({
        jobId: idSchema("jobId")
    })
});