"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editMessageWSSchema = exports.deleteMessageWSSchema = exports.createMessageWSSchema = exports.markMessagesSeenWSSchema = exports.muteChannelSchema = exports.deleteChannelSchema = exports.groupChangeRoleSchema = exports.groupRenameSchema = exports.groupCancelInviteSchema = exports.getMessagesSchema = exports.leaveChannelSchema = exports.groupRemoveUserSchema = exports.acceptInviteSchema = exports.getInvitesListSchema = exports.getChannelsListSchema = exports.getChannelSchema = exports.groupInviteUserSchema = exports.createDirectMessagesSchema = exports.createGroupSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
const ChannelRolesEnum_1 = __importDefault(require("../data/ChannelRolesEnum"));
exports.createGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: commonSchema_1.channelTitleSchema
    })
});
exports.createDirectMessagesSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId")
    })
});
exports.groupInviteUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId"),
        userId: (0, commonSchema_1.idSchema)("userId")
    })
});
exports.getChannelSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId"),
        includeParticipants: zod_1.z.boolean().optional(),
        includeInvites: zod_1.z.boolean().optional()
    })
});
exports.getChannelsListSchema = zod_1.z.object({
    body: zod_1.z.object({
        fromDate: commonSchema_1.isoDateTimeSchema.nullish(),
        count: commonSchema_1.countPerPageSchema
    })
});
exports.getInvitesListSchema = zod_1.z.object({
    body: zod_1.z.object({
        fromDate: commonSchema_1.isoDateTimeSchema.nullish(),
        count: commonSchema_1.countPerPageSchema
    })
});
exports.acceptInviteSchema = zod_1.z.object({
    body: zod_1.z.object({
        inviteId: (0, commonSchema_1.idSchema)("inviteId"),
        accepted: zod_1.z.boolean("Accepted must be a boolean")
    })
});
exports.groupRemoveUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId"),
        userId: (0, commonSchema_1.idSchema)("userId")
    })
});
exports.leaveChannelSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId")
    })
});
exports.getMessagesSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId"),
        count: commonSchema_1.countPerPageSchema,
        fromDate: commonSchema_1.isoDateTimeSchema.nullish()
    })
});
exports.groupCancelInviteSchema = zod_1.z.object({
    body: zod_1.z.object({
        inviteId: (0, commonSchema_1.idSchema)("inviteId")
    })
});
exports.groupRenameSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId"),
        title: commonSchema_1.channelTitleSchema
    })
});
exports.groupChangeRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId"),
        userId: (0, commonSchema_1.idSchema)("userId"),
        role: zod_1.z.enum(Object.values(ChannelRolesEnum_1.default), "Invalid role")
    })
});
exports.deleteChannelSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId")
    })
});
exports.muteChannelSchema = zod_1.z.object({
    body: zod_1.z.object({
        channelId: (0, commonSchema_1.idSchema)("channelId"),
        muted: zod_1.z.boolean("Muted must be a boolean")
    })
});
exports.markMessagesSeenWSSchema = zod_1.z.object({
    channelId: (0, commonSchema_1.idSchema)("channelId")
});
exports.createMessageWSSchema = zod_1.z.object({
    channelId: (0, commonSchema_1.idSchema)("channelId"),
    content: commonSchema_1.channelMessageSchema,
    repliedTo: (0, commonSchema_1.idSchema)("repliedTo").nullish()
});
exports.deleteMessageWSSchema = zod_1.z.object({
    messageId: (0, commonSchema_1.idSchema)("messageId")
});
exports.editMessageWSSchema = zod_1.z.object({
    messageId: (0, commonSchema_1.idSchema)("messageId"),
    content: commonSchema_1.channelMessageSchema
});
