"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePostImageSchema = exports.getPostImageListSchema = exports.searchProfilesSchema = exports.updateNotificationsSchema = exports.markNotificationsClickedSchema = exports.markNotificationsSeenSchema = exports.getNotificationsSchema = exports.removeProfileImageSchema = exports.uploadProfileAvatarImageSchema = exports.getFollowingSchema = exports.getFollowersSchema = exports.unfollowSchema = exports.followSchema = exports.verifyEmailChangeSchema = exports.changeEmailSchema = exports.updateProfileSchema = exports.getProfileSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
exports.getProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId")
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId"),
        name: commonSchema_1.usernameSchema,
        bio: zod_1.z.string().max(120, "Bio cannot exceed 120 characters"),
        countryCode: commonSchema_1.countryCodeSchema
    }),
});
exports.changeEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: commonSchema_1.emailSchema,
        password: commonSchema_1.passwordSchema
    }),
});
exports.verifyEmailChangeSchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z.string()
    })
});
exports.followSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId")
    }),
});
exports.unfollowSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId")
    }),
});
exports.getFollowersSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId"),
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema
    }),
});
exports.getFollowingSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId"),
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema
    }),
});
exports.uploadProfileAvatarImageSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId")
    })
});
exports.removeProfileImageSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId")
    })
});
exports.getNotificationsSchema = zod_1.z.object({
    body: zod_1.z.object({
        count: commonSchema_1.countPerPageSchema,
        fromId: (0, commonSchema_1.idSchema)("fromId").nullish()
    }),
});
exports.markNotificationsSeenSchema = zod_1.z.object({
    body: zod_1.z.object({
        fromId: (0, commonSchema_1.idSchema)("fromId")
    }),
});
exports.markNotificationsClickedSchema = zod_1.z.object({
    body: zod_1.z.object({
        ids: zod_1.z.array((0, commonSchema_1.idSchema)("id")).nullish()
    }),
});
exports.updateNotificationsSchema = zod_1.z.object({
    body: zod_1.z.object({
        notifications: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.enum(NotificationTypeEnum_1.default),
            enabled: zod_1.z.boolean()
        }))
    }),
});
exports.searchProfilesSchema = zod_1.z.object({
    body: zod_1.z.object({
        searchQuery: commonSchema_1.searchQuerySchema
    }),
});
exports.getPostImageListSchema = zod_1.z.object({
    body: zod_1.z.object({
        page: commonSchema_1.pageSchema,
        count: commonSchema_1.countPerPageSchema,
        userId: (0, commonSchema_1.idSchema)("userId").nullish(),
    }),
});
exports.deletePostImageSchema = zod_1.z.object({
    body: zod_1.z.object({
        fileId: (0, commonSchema_1.idSchema)("fileId"),
    }),
});
