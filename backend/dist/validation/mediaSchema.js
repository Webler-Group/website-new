"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileByIdSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const commonSchema_1 = require("./commonSchema");
exports.getFileByIdSchema = zod_1.default.object({
    params: zod_1.default.object({
        fileId: (0, commonSchema_1.idSchema)("fileId")
    })
});
