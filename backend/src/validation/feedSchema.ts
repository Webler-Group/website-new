import { z } from "zod";
import { idSchema, pageSchema, countPerPageSchema, searchQuerySchema, messageSchema, indexSchema, filterSchema, tagNameSchema, commentMessageSchema } from "./commonSchema";
import ReactionsEnum from "../data/ReactionsEnum";

export const createFeedSchema = z.object({
    body: z.object({
        message: messageSchema,
    })
});

export const editFeedSchema = z.object({
    body: z.object({
        feedId: idSchema("feedId"),
        message: messageSchema,
    })
});

export const deleteFeedSchema = z.object({
    body: z.object({
        feedId: idSchema("feedId")
    })
});

export const createReplySchema = z.object({
    body: z.object({
        message: commentMessageSchema,
        feedId: idSchema("feedId"),
        parentId: idSchema("parentId").nullish()
    })
});

export const editReplySchema = z.object({
    body: z.object({
        id: idSchema("id"),
        message: commentMessageSchema
    })
});

export const deleteReplySchema = z.object({
    body: z.object({
        id: idSchema("id")
    })
});

export const shareFeedSchema = z.object({
    body: z.object({
        feedId: idSchema("feedId"),
        message: messageSchema
    })
});

export const getFeedListSchema = z.object({
    body: z.object({
        page: pageSchema,
        count: countPerPageSchema,
        filter: filterSchema([1, 2, 3, 4, 5, 6, 7]), // 1: Recent, 2: My Posts, 3: Following, 4: Hot Today, 5: Trending, 6: Most Shared, 7: Pinned
        searchQuery: searchQuerySchema,
        userId: idSchema("userId").nullish()
    })
});

export const getFeedSchema = z.object({
    body: z.object({
        feedId: idSchema("feedId")
    })
});

export const getRepliesSchema = z.object({
    body: z.object({
        feedId: idSchema("feedId"),
        parentId: idSchema("parentId").nullish(),
        index: indexSchema,
        count: countPerPageSchema,
        filter: filterSchema([1, 2, 3]), // 1: Most popular, 2: Oldest first, 3: Newest first
        findPostId: idSchema("findPostId").nullish()
    })
});

export const togglePinFeedSchema = z.object({
    body: z.object({
        feedId: idSchema("feedId"),
        pinned: z.boolean("Pinned must be a boolean")
    })
});

export const votePostSchema = z.object({
    body: z.object({
        postId: idSchema("postId"),
        vote: z.boolean("Vote must be a boolean"),
        reaction: z.union([z.number().refine((val) => Object.values(ReactionsEnum).map(Number).includes(val), "Invalid reaction number"), z.null()])
    })
});

export const getUserReactionsSchema = z.object({
    body: z.object({
        parentId: idSchema("parentId"),
        page: pageSchema,
        count: countPerPageSchema
    })
});