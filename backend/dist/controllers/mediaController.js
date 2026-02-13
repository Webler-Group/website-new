"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const fs_1 = __importDefault(require("fs"));
const File_1 = __importDefault(require("../models/File"));
const zodUtils_1 = require("../utils/zodUtils");
const mediaSchema_1 = require("../validation/mediaSchema");
const fileHelper_1 = require("../helpers/fileHelper");
const getFileById = (0, express_async_handler_1.default)(async (req, res) => {
    const { params } = (0, zodUtils_1.parseWithZod)(mediaSchema_1.getFileByIdSchema, req);
    const { fileId } = params;
    // Fetch file metadata only
    const fileDoc = await File_1.default.findById(fileId).select("mimetype size updatedAt contenthash");
    if (!fileDoc) {
        res.status(404).end();
        return;
    }
    const absolutePath = (0, fileHelper_1.absBlobPathFromHash)(fileDoc.contenthash);
    if (!fs_1.default.existsSync(absolutePath)) {
        res.status(404).end();
        return;
    }
    // Headers
    res.setHeader("Content-Type", fileDoc.mimetype);
    res.setHeader("Content-Length", String(fileDoc.size));
    // Immutable files → safe to cache aggressively
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    // Optional strong ETag
    const etag = `"${fileDoc._id.toString()}-${fileDoc.updatedAt.getTime()}"`;
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"] === etag) {
        res.status(304).end();
        return;
    }
    // Stream file
    const stream = fs_1.default.createReadStream(absolutePath);
    stream.on("error", () => res.status(500).end());
    stream.pipe(res);
});
const mediaController = {
    getFileById
};
exports.default = mediaController;
