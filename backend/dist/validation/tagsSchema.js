"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTagSchema = exports.executeTagJobsSchema = void 0;
const zod_1 = require("zod");
const commonSchema_1 = require("./commonSchema");
exports.executeTagJobsSchema = zod_1.z.object({
    body: zod_1.z.object({
        tags: zod_1.z.array(commonSchema_1.tagNameSchema).min(1, "At least one tag must be provided"),
        action: zod_1.z.enum(["create", "delete"], "Action must be 'create' or 'delete'")
    })
});
exports.getTagSchema = zod_1.z.object({
    body: zod_1.z.object({
        tagName: commonSchema_1.tagNameSchema
    })
});
