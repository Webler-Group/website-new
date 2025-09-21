"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRolesSchema = exports.banUserSchema = exports.getUserSchema = exports.getUsersListSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
const RolesEnum_1 = __importDefault(require("../data/RolesEnum"));
exports.getUsersListSchema = zod_1.z.object({
    body: zod_1.z.object({
        search: commonSchema_1.searchQuerySchema,
        count: commonSchema_1.countPerPageSchema,
        page: commonSchema_1.pageSchema,
        date: commonSchema_1.isoDateTimeSchema.optional(),
        role: zod_1.z.enum(Object.values(RolesEnum_1.default)).optional(),
        active: zod_1.z.boolean().optional()
    })
});
exports.getUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId")
    })
});
exports.banUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId"),
        active: zod_1.z.boolean("Active must be a boolean"),
        note: zod_1.z.string().max(120, "Note cannot exceed 120 characters").optional()
    })
});
exports.updateRolesSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: (0, commonSchema_1.idSchema)("userId"),
        roles: zod_1.z.array(zod_1.z.enum(RolesEnum_1.default, "Invalid role"))
    })
});
