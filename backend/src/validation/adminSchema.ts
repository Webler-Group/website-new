import { z } from "zod";
import { idSchema, pageSchema, countPerPageSchema, searchQuerySchema, isoDateTimeSchema, emailSchema, usernameSchema } from "./commonSchema";
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


export const saveBasicInfoSchema = z.object({
    body: z.object({
        userId: idSchema("userId"),
        email: emailSchema,
        name: usernameSchema,
        isVerified: z.boolean().default(false),
        isActive: z.boolean().default(false),
        roles: z.array(z.enum(RolesEnum, "Invalid role")),
        active: z.boolean("Active must be a boolean"),
        bio: z.string().max(120, "Bio cannot exceed 120 characters"),
        xp: z.number().default(10)
    })
})

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