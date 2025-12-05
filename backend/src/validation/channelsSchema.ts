import { z } from "zod";
import { idSchema, countPerPageSchema, messageSchema, titleSchema, channelMessageSchema, isoDateTimeSchema, channelTitleSchema } from "./commonSchema";
import ChannelRolesEnum from "../data/ChannelRolesEnum";

export const createGroupSchema = z.object({
    body: z.object({
        title: channelTitleSchema
    })
});

export const createDirectMessagesSchema = z.object({
    body: z.object({
        userId: idSchema("userId")
    })
});

export const groupInviteUserSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId"),
        userId: idSchema("userId")
    })
});

export const getChannelSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId"),
        includeParticipants: z.boolean().optional(),
        includeInvites: z.boolean().optional()
    })
});

export const getChannelsListSchema = z.object({
    body: z.object({
        fromDate: isoDateTimeSchema.nullish(),
        count: countPerPageSchema
    })
});

export const getInvitesListSchema = z.object({
    body: z.object({
        fromDate: isoDateTimeSchema.nullish(),
        count: countPerPageSchema
    })
});

export const acceptInviteSchema = z.object({
    body: z.object({
        inviteId: idSchema("inviteId"),
        accepted: z.boolean("Accepted must be a boolean")
    })
});

export const groupRemoveUserSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId"),
        userId: idSchema("userId")
    })
});

export const leaveChannelSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId")
    })
});

export const getMessagesSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId"),
        count: countPerPageSchema,
        fromDate: isoDateTimeSchema.nullish()
    })
});

export const groupCancelInviteSchema = z.object({
    body: z.object({
        inviteId: idSchema("inviteId")
    })
});

export const groupRenameSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId"),
        title: channelTitleSchema
    })
});

export const groupChangeRoleSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId"),
        userId: idSchema("userId"),
        role: z.enum(Object.values(ChannelRolesEnum), "Invalid role")
    })
});

export const deleteChannelSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId")
    })
});

export const muteChannelSchema = z.object({
    body: z.object({
        channelId: idSchema("channelId"),
        muted: z.boolean("Muted must be a boolean")
    })
});

export const markMessagesSeenWSSchema = z.object({
    channelId: idSchema("channelId")
});

export const createMessageWSSchema = z.object({
    channelId: idSchema("channelId"),
    content: channelMessageSchema,
    repliedTo: idSchema("repliedTo").nullish()
});

export const deleteMessageWSSchema = z.object({
    messageId: idSchema("messageId")
});

export const editMessageWSSchema = z.object({
    messageId: idSchema("messageId"),
    content: channelMessageSchema
});