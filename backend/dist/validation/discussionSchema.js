"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVotersListSchema = exports.unfollowQuestionSchema = exports.followQuestionSchema = exports.votePostSchema = exports.deleteReplySchema = exports.editReplySchema = exports.deleteQuestionSchema = exports.editQuestionSchema = exports.toggleAcceptedAnswerSchema = exports.getRepliesSchema = exports.createReplySchema = exports.getQuestionSchema = exports.getQuestionListSchema = exports.createQuestionSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
exports.createQuestionSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: commonSchema_1.questionTitleSchema,
        message: commonSchema_1.messageSchema,
        tags: zod_1.z.array(commonSchema_1.tagNameSchema).max(10, "Maximum 10 tags allowed")
    })
});
exports.getQuestionListSchema = zod_1.z.object({
    body: zod_1.z.object({
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema,
        filter: (0, commonSchema_1.filterSchema)([1, 2, 3, 4, 5, 6]),
        searchQuery: commonSchema_1.searchQuerySchema,
        userId: (0, commonSchema_1.idSchema)("userId").nullish()
    })
});
exports.getQuestionSchema = zod_1.z.object({
    body: zod_1.z.object({
        questionId: (0, commonSchema_1.idSchema)("questionId")
    })
});
exports.createReplySchema = zod_1.z.object({
    body: zod_1.z.object({
        message: commonSchema_1.messageSchema,
        questionId: (0, commonSchema_1.idSchema)("questionId")
    })
});
exports.getRepliesSchema = zod_1.z.object({
    body: zod_1.z.object({
        questionId: (0, commonSchema_1.idSchema)("questionId"),
        index: commonSchema_1.indexSchema,
        count: commonSchema_1.countPerPageSchema,
        filter: (0, commonSchema_1.filterSchema)([1, 2, 3]),
        findPostId: (0, commonSchema_1.idSchema)("findPostId").nullish()
    })
});
exports.toggleAcceptedAnswerSchema = zod_1.z.object({
    body: zod_1.z.object({
        accepted: zod_1.z.boolean("Accepted must be a boolean"),
        postId: (0, commonSchema_1.idSchema)("postId")
    })
});
exports.editQuestionSchema = zod_1.z.object({
    body: zod_1.z.object({
        questionId: (0, commonSchema_1.idSchema)("questionId"),
        title: commonSchema_1.questionTitleSchema,
        message: commonSchema_1.messageSchema,
        tags: zod_1.z.array(commonSchema_1.tagNameSchema).max(10, "Maximum 10 tags allowed")
    })
});
exports.deleteQuestionSchema = zod_1.z.object({
    body: zod_1.z.object({
        questionId: (0, commonSchema_1.idSchema)("questionId")
    })
});
exports.editReplySchema = zod_1.z.object({
    body: zod_1.z.object({
        replyId: (0, commonSchema_1.idSchema)("replyId"),
        message: commonSchema_1.messageSchema
    })
});
exports.deleteReplySchema = zod_1.z.object({
    body: zod_1.z.object({
        replyId: (0, commonSchema_1.idSchema)("replyId")
    })
});
exports.votePostSchema = zod_1.z.object({
    body: zod_1.z.object({
        postId: (0, commonSchema_1.idSchema)("postId"),
        vote: commonSchema_1.voteSchema
    })
});
exports.followQuestionSchema = zod_1.z.object({
    body: zod_1.z.object({
        postId: (0, commonSchema_1.idSchema)("postId")
    })
});
exports.unfollowQuestionSchema = zod_1.z.object({
    body: zod_1.z.object({
        postId: (0, commonSchema_1.idSchema)("postId")
    })
});
exports.getVotersListSchema = zod_1.z.object({
    body: zod_1.z.object({
        parentId: (0, commonSchema_1.idSchema)("parentId"),
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema
    })
});
