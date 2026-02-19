import { z } from "zod";
import { idSchema, pageSchema, countPerPageSchema, searchQuerySchema, isoDateTimeSchema } from "./commonSchema";
import RolesEnum from "../data/RolesEnum";

export const getUsersListSchema = z.object({
    body: z.object({
        search: searchQuerySchema,
        count: countPerPageSchema,
        page: pageSchema,
        date: isoDateTimeSchema.optional(),
        role: z.enum(Object.values(RolesEnum) as [string, ...string[]]).optional(),
        active: z.boolean().optional()
    })
});

export const getUserSchema = z.object({
    body: z.object({
        userId: idSchema("userId")
    })
});

export const banUserSchema = z.object({
    body: z.object({
        userId: idSchema("userId"),
        active: z.boolean("Active must be a boolean"),
        note: z.string().max(120, "Note cannot exceed 120 characters").optional()
    })
});

export const updateRolesSchema = z.object({
    body: z.object({
        userId: idSchema("userId"),
        roles: z.array(z.enum(RolesEnum, "Invalid role"))
    })
});

export const exportCourseSchema = z.object({
    body: z.object({
        courseId: idSchema("courseId")
    })
});