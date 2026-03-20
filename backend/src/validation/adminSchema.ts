import { z } from "zod";
import { idSchema, pageSchema, countPerPageSchema, searchQuerySchema, isoDateTimeSchema, filterSchema } from "./commonSchema";
import RolesEnum from "../data/RolesEnum";

export const getUsersListSchema = z.object({
    body: z.object({
        search: searchQuerySchema,
        count: countPerPageSchema,
        page: pageSchema,
        filter: filterSchema([1, 2, 3, 4]).optional(),
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

export const deleteUserFilesSchema = z.object({
    body: z.object({
        userId: idSchema("userId")
    })
});

export const toggleBanIpSchema = z.object({
    body: z.object({
        ipId: idSchema("ipId"),
        banned: z.boolean()
    })
});

export const getIpListSchema = z.object({
    body: z.object({
        count: countPerPageSchema,
        page: pageSchema,
        banned: z.boolean().optional(),
        value: searchQuerySchema
    })
});

export const createIpSchema = z.object({
    body: z.object({
        value: z.string().min(1, "IP value is required").max(45, "IP value cannot exceed 45 characters").trim()
    })
});

