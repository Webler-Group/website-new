import { z } from "zod";
import { countPerPageSchema, countryCodeSchema, emailSchema, idSchema, pageSchema, passwordSchema, searchQuerySchema, usernameSchema } from "./commonSchema";
import NotificationTypeEnum from "../data/NotificationTypeEnum";

export const getProfileSchema = z.object({
  body: z.object({
    userId: idSchema("userId")
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    userId: idSchema("userId"),
    name: usernameSchema,
    bio: z.string().max(120, "Bio cannot exceed 120 characters"),
    countryCode: countryCodeSchema
  }),
});

export const changeEmailSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema
  }),
});

export const verifyEmailChangeSchema = z.object({
    body: z.object({
        code: z.string()
    })
});

export const followSchema = z.object({
  body: z.object({
    userId: idSchema("userId")
  }),
});

export const unfollowSchema = z.object({
  body: z.object({
    userId: idSchema("userId")
  }),
});

export const getFollowersSchema = z.object({
  body: z.object({
    userId: idSchema("userId"),
    page: pageSchema,
    count: countPerPageSchema
  }),
});

export const getFollowingSchema = z.object({
  body: z.object({
    userId: idSchema("userId"),
    page: pageSchema,
    count: countPerPageSchema
  }),
});

export const getNotificationsSchema = z.object({
  body: z.object({
    count: countPerPageSchema,
    fromId: idSchema("fromId").nullish()
  }),
});

export const markNotificationsSeenSchema = z.object({
  body: z.object({
    fromId: idSchema("fromId")
  }),
});

export const markNotificationsClickedSchema = z.object({
  body: z.object({
    ids: z.array(idSchema("id")).nullish()
  }),
});

export const updateNotificationsSchema = z.object({
  body: z.object({
    notifications: z.array(z.object({
      type: z.enum(NotificationTypeEnum),
      enabled: z.boolean()
    }))
  }),
});

export const searchProfilesSchema = z.object({
  body: z.object({
    searchQuery: searchQuerySchema
  }),
});