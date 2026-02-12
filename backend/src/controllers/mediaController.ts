import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import fs from "fs";
import File from "../models/File";
import { parseWithZod } from "../utils/zodUtils";
import { getFileByIdSchema } from "../validation/mediaSchema";
import { absBlobPathFromHash } from "../helpers/fileHelper";

const getFileById = asyncHandler(
    async (req: Request, res: Response) => {
        const { params } = parseWithZod(getFileByIdSchema, req);
        const { fileId } = params;

        // Fetch file metadata only
        const fileDoc = await File.findById(fileId).select(
            "mimetype size updatedAt contenthash"
        );

        if (!fileDoc) {
            res.status(404).end();
            return;
        }

        const absolutePath = absBlobPathFromHash(fileDoc.contenthash);

        if (!fs.existsSync(absolutePath)) {
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
        const stream = fs.createReadStream(absolutePath);
        stream.on("error", () => res.status(500).end());
        stream.pipe(res);
    }
);

const mediaController = {
    getFileById
};

export default mediaController;