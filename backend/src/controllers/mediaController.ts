import { Request, Response } from "express";
import fs from "fs";
import FileModel from "../models/File";
import { parseWithZod } from "../utils/zodUtils";
import { getFileByHashSchema } from "../validation/mediaSchema";
import { absBlobPathFromHash } from "../helpers/fileHelper";
import FileTypeEnum from "../data/FileTypeEnum";
import { ZodError } from "zod";

const getFileByHash = async (req: Request, res: Response) => {
    try {
        const { params } = parseWithZod(getFileByHashSchema, req);
        const { hash } = params;

        const fileDoc = await FileModel.findOne(
            { contenthash: hash },
            { _type: 1, mimetype: 1, size: 1, updatedAt: 1, contenthash: 1 }
        ).lean();

        if (!fileDoc || fileDoc._type === FileTypeEnum.FOLDER) {
            res.status(404).end();
            return;
        }

        const absolutePath = absBlobPathFromHash(fileDoc.contenthash!);
        if (!fs.existsSync(absolutePath)) {
            res.status(404).end();
            return;
        }

        const etag = `"${fileDoc._id.toString()}-${fileDoc.updatedAt.getTime()}"`;

        res.setHeader("Content-Type", fileDoc.mimetype!);
        res.setHeader("Content-Length", String(fileDoc.size));
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("ETag", etag);

        if (req.headers["if-none-match"] === etag) {
            res.status(304).end();
            return;
        }

        const stream = fs.createReadStream(absolutePath);
        stream.on("error", () => res.status(500).end());
        stream.pipe(res);
    } catch (err) {
        if (err instanceof ZodError) {
            res.status(400).end();
        } else {
            console.log("Media controller error:", err);
            res.status(500).end();
        }
    }
};

const getFilePreviewByHash = async (req: Request, res: Response) => {
    try {
        const { params } = parseWithZod(getFileByHashSchema, req);
        const { hash } = params;

        const fileDoc = await FileModel.findOne(
            { contenthash: hash },
            { _type: 1, updatedAt: 1, preview: 1 }
        ).lean();

        if (!fileDoc || fileDoc._type === FileTypeEnum.FOLDER || !fileDoc.preview) {
            res.status(404).end();
            return;
        }

        const absolutePath = absBlobPathFromHash(fileDoc.preview.contenthash);
        if (!fs.existsSync(absolutePath)) {
            res.status(404).end();
            return;
        }

        const etag = `"${fileDoc._id.toString()}-preview-${fileDoc.updatedAt.getTime()}"`;

        res.setHeader("Content-Type", fileDoc.preview.mimetype);
        res.setHeader("Content-Length", String(fileDoc.preview.size));
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("ETag", etag);

        if (req.headers["if-none-match"] === etag) {
            res.status(304).end();
            return;
        }

        const stream = fs.createReadStream(absolutePath);
        stream.on("error", () => res.status(500).end());
        stream.pipe(res);
    } catch (err) {
        if (err instanceof ZodError) {
            res.status(400).end();
        } else {
            console.log("Media controller error:", err);
            res.status(500).end();
        }
    }
};

export const getImageUrl = (hash?: string | null) => hash ? `/media/files/${hash}` : null;

const mediaController = {
    getFileByHash,
    getFilePreviewByHash
};

export default mediaController;