import { z } from "zod";
import { idSchema, pageSchema, countPerPageSchema, searchQuerySchema, messageSchema, indexSchema, filterSchema, titleSchema, tagNameSchema, voteSchema, questionTitleSchema } from "./commonSchema";

export const createQuestionSchema = z.object({
    body: z.object({
        title: questionTitleSchema,
        message: messageSchema,
        tags: z.array(tagNameSchema).max(10, "Maximum 10 tags allowed")
    })
});

export const getQuestionListSchema = z.object({
    body: z.object({
        page: pageSchema,
        count: countPerPageSchema,
        filter: filterSchema([1, 2, 3, 4, 5, 6]),
        searchQuery: searchQuerySchema,
        userId: idSchema("userId").nullish()
    })
});

export const getQuestionSchema = z.object({
    body: z.object({
        questionId: idSchema("questionId")
    })
});

export const createReplySchema = z.object({
    body: z.object({
        message: messageSchema,
        questionId: idSchema("questionId")
    })
});

export const getRepliesSchema = z.object({
    body: z.object({
        questionId: idSchema("questionId"),
        index: indexSchema,
        count: countPerPageSchema,
        filter: filterSchema([1, 2, 3]),
        findPostId: idSchema("findPostId").nullish()
    })
});

export const toggleAcceptedAnswerSchema = z.object({
    body: z.object({
        accepted: z.boolean("Accepted must be a boolean"),
        postId: idSchema("postId")
    })
});

export const editQuestionSchema = z.object({
    body: z.object({
        questionId: idSchema("questionId"),
        title: questionTitleSchema,
        message: messageSchema,
        tags: z.array(tagNameSchema).max(10, "Maximum 10 tags allowed")
    })
});

export const deleteQuestionSchema = z.object({
    body: z.object({
        questionId: idSchema("questionId")
    })
});

export const editReplySchema = z.object({
    body: z.object({
        replyId: idSchema("replyId"),
        message: messageSchema
    })
});

export const deleteReplySchema = z.object({
    body: z.object({
        replyId: idSchema("replyId")
    })
});

export const votePostSchema = z.object({
    body: z.object({
        postId: idSchema("postId"),
        vote: voteSchema
    })
});

export const followQuestionSchema = z.object({
    body: z.object({
        postId: idSchema("postId")
    })
});

export const unfollowQuestionSchema = z.object({
    body: z.object({
        postId: idSchema("postId")
    })
});

export const getVotersListSchema = z.object({
    body: z.object({
        parentId: idSchema("parentId"),
        page: pageSchema,
        count: countPerPageSchema
    })
});