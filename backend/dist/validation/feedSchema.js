"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserReactionsSchema = exports.votePostSchema = exports.togglePinFeedSchema = exports.getRepliesSchema = exports.getFeedSchema = exports.getFeedListSchema = exports.shareFeedSchema = exports.deleteReplySchema = exports.editReplySchema = exports.createReplySchema = exports.deleteFeedSchema = exports.editFeedSchema = exports.createFeedSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
const ReactionsEnum_1 = __importDefault(require("../data/ReactionsEnum"));
exports.createFeedSchema = zod_1.z.object({
    body: zod_1.z.object({
        message: commonSchema_1.messageSchema,
    })
});
exports.editFeedSchema = zod_1.z.object({
    body: zod_1.z.object({
        feedId: (0, commonSchema_1.idSchema)("feedId"),
        message: commonSchema_1.messageSchema,
    })
});
exports.deleteFeedSchema = zod_1.z.object({
    body: zod_1.z.object({
        feedId: (0, commonSchema_1.idSchema)("feedId")
    })
});
exports.createReplySchema = zod_1.z.object({
    body: zod_1.z.object({
        message: commonSchema_1.commentMessageSchema,
        feedId: (0, commonSchema_1.idSchema)("feedId"),
        parentId: (0, commonSchema_1.idSchema)("parentId").nullish()
    })
});
exports.editReplySchema = zod_1.z.object({
    body: zod_1.z.object({
        id: (0, commonSchema_1.idSchema)("id"),
        message: commonSchema_1.commentMessageSchema
    })
});
exports.deleteReplySchema = zod_1.z.object({
    body: zod_1.z.object({
        id: (0, commonSchema_1.idSchema)("id")
    })
});
exports.shareFeedSchema = zod_1.z.object({
    body: zod_1.z.object({
        feedId: (0, commonSchema_1.idSchema)("feedId"),
        message: commonSchema_1.messageSchema
    })
});
exports.getFeedListSchema = zod_1.z.object({
    body: zod_1.z.object({
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema,
        filter: (0, commonSchema_1.filterSchema)([1, 2, 3, 4, 5, 6, 7]),
        searchQuery: commonSchema_1.searchQuerySchema,
        userId: (0, commonSchema_1.idSchema)("userId").nullish()
    })
});
exports.getFeedSchema = zod_1.z.object({
    body: zod_1.z.object({
        feedId: (0, commonSchema_1.idSchema)("feedId")
    })
});
exports.getRepliesSchema = zod_1.z.object({
    body: zod_1.z.object({
        feedId: (0, commonSchema_1.idSchema)("feedId"),
        parentId: (0, commonSchema_1.idSchema)("parentId").nullish(),
        index: commonSchema_1.indexSchema,
        count: commonSchema_1.countPerPageSchema,
        filter: (0, commonSchema_1.filterSchema)([1, 2, 3]),
        findPostId: (0, commonSchema_1.idSchema)("findPostId").nullish()
    })
});
exports.togglePinFeedSchema = zod_1.z.object({
    body: zod_1.z.object({
        feedId: (0, commonSchema_1.idSchema)("feedId"),
        pinned: zod_1.z.boolean("Pinned must be a boolean")
    })
});
exports.votePostSchema = zod_1.z.object({
    body: zod_1.z.object({
        postId: (0, commonSchema_1.idSchema)("postId"),
        vote: zod_1.z.boolean("Vote must be a boolean"),
        reaction: zod_1.z.union([zod_1.z.number().refine((val) => Object.values(ReactionsEnum_1.default).map(Number).includes(val), "Invalid reaction number"), zod_1.z.null()])
    })
});
exports.getUserReactionsSchema = zod_1.z.object({
    body: zod_1.z.object({
        parentId: (0, commonSchema_1.idSchema)("parentId"),
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema
    })
});
