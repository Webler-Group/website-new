import { z } from "zod";
import { tagNameSchema } from "./commonSchema";

export const executeTagJobsSchema = z.object({
    body: z.object({
        tags: z.array(tagNameSchema).min(1, "At least one tag must be provided"),
        action: z.enum(["create", "delete"], "Action must be 'create' or 'delete'")
    })
});

export const getTagSchema = z.object({
    body: z.object({
        tagName: tagNameSchema
    })
});