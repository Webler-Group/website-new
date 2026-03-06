import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import fs from "fs";
import File from "../models/File";
import { parseWithZod } from "../utils/zodUtils";
import { getFileByHashSchema } from "../validation/mediaSchema";
import { absBlobPathFromHash } from "../helpers/fileHelper";
import FileTypeEnum from "../data/FileTypeEnum";

const getFileByHash = asyncHandler(
    async (req: Request, res: Response) => {
        const { params } = parseWithZod(getFileByHashSchema, req);
        const { hash } = params;

        // Fetch file metadata only
        const fileDoc = await File.findOne({ contenthash: hash },
            "_type mimetype size updatedAt contenthash"
        );

        if (!fileDoc || fileDoc._type === FileTypeEnum.FOLDER) {
            res.status(404).end();
            return;
        }

        const absolutePath = absBlobPathFromHash(fileDoc.contenthash!);

        if (!fs.existsSync(absolutePath)) {
            res.status(404).end();
            return;
        }

        // Headers
        res.setHeader("Content-Type", fileDoc.mimetype!);
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

const getFilePreviewByHash = asyncHandler(
    async (req: Request, res: Response) => {
        const { params } = parseWithZod(getFileByHashSchema, req);
        const { hash } = params;

        try {
            const fileDoc = await File.findOne({ contenthash: hash }, "_type updatedAt preview");

            if (!fileDoc || fileDoc._type === FileTypeEnum.FOLDER || !fileDoc.preview) {
                res.status(404).end();
                return;
            }

            const absolutePath = absBlobPathFromHash(fileDoc.preview.contenthash);

            if (!fs.existsSync(absolutePath)) {
                res.status(404).end();
                return;
            }

            res.setHeader("Content-Type", fileDoc.preview.mimetype);
            res.setHeader("Content-Length", String(fileDoc.preview.size));
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

            const etag = `"${fileDoc._id.toString()}-preview-${fileDoc.updatedAt.getTime()}"`;
            res.setHeader("ETag", etag);

            if (req.headers["if-none-match"] === etag) {
                res.status(304).end();
                return;
            }

            const stream = fs.createReadStream(absolutePath);
            stream.on("error", () => res.status(500).end());
            stream.pipe(res);
        } catch (err) {
            console.log(err);

        }
    }
);

export const getImageUrl = (hash?: string | null) => hash ? `/media/files/${hash}` : null;

const mediaController = {
    getFileByHash,
    getFilePreviewByHash
};

export default mediaController;