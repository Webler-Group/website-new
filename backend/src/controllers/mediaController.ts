import { NextFunction, Request, Response } from "express";
import fs from "fs";
import FileModel from "../models/File";
import { parseWithZod } from "../utils/zodUtils";
import { getFileByHashSchema, getFileByHashWithNameSchema } from "../validation/mediaSchema";
import { absBlobPathFromHash } from "../helpers/fileHelper";
import FileTypeEnum from "../data/FileTypeEnum";
import { ZodError } from "zod";
import { isInlineSafeMime, toDownloadFilename } from "../utils/fileTypes";

type BlobInfo = {
    contenthash: string;
    mimetype: string;
    size: number;
    etag: string;
    /** Set for anything that must not render in the browser (non-images) */
    downloadName?: string;
};

const sendBlob = (req: Request, res: Response, blob: BlobInfo) => {
    const absolutePath = absBlobPathFromHash(blob.contenthash);
    if (!fs.existsSync(absolutePath)) {
        res.status(404).end();
        return;
    }

    res.setHeader("Content-Type", blob.mimetype);
    res.setHeader("Content-Length", String(blob.size));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", blob.etag);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (blob.downloadName !== undefined) {
        res.setHeader("Content-Disposition", `attachment; filename="${toDownloadFilename(blob.downloadName)}"`);
        res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    }

    if (req.headers["if-none-match"] === blob.etag) {
        res.status(304).end();
        return;
    }

    const stream = fs.createReadStream(absolutePath);
    stream.on("error", () => res.status(500).end());
    stream.pipe(res);
};

const handleMediaError = (res: Response, err: unknown) => {
    if (err instanceof ZodError) {
        res.status(400).end();
    } else {
        console.log("Media controller error:", err);
        res.status(500).end();
    }
};

const serveFile = async (req: Request, res: Response, hash: string, requestedName?: string) => {
    const fileDoc = await FileModel.findOne(
        { contenthash: hash },
        { _type: 1, mimetype: 1, size: 1, updatedAt: 1, contenthash: 1, name: 1 }
    ).lean();

    if (!fileDoc || fileDoc._type === FileTypeEnum.FOLDER) {
        res.status(404).end();
        return;
    }

    const inline = isInlineSafeMime(fileDoc.mimetype);
    sendBlob(req, res, {
        contenthash: fileDoc.contenthash!,
        mimetype: fileDoc.mimetype ?? "application/octet-stream",
        size: fileDoc.size!,
        etag: `"${fileDoc._id.toString()}-${fileDoc.updatedAt.getTime()}"`,
        downloadName: inline ? undefined : (requestedName ?? fileDoc.name)
    });
};

const getFileByHash = async (req: Request, res: Response) => {
    try {
        const { params } = parseWithZod(getFileByHashSchema, req);
        await serveFile(req, res, params.hash);
    } catch (err) {
        handleMediaError(res, err);
    }
};

/** /media/files/:hash/:filename - same blob, the filename is used as the download name */
const getFileByHashWithName = async (req: Request, res: Response) => {
    try {
        const { params } = parseWithZod(getFileByHashWithNameSchema, req);
        await serveFile(req, res, params.hash, params.filename);
    } catch (err) {
        handleMediaError(res, err);
    }
};

const getFilePreviewByHash = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { params } = parseWithZod(getFileByHashSchema, req);
        const { hash } = params;

        const fileDoc = await FileModel.findOne(
            { contenthash: hash },
            { _type: 1, updatedAt: 1, preview: 1 }
        ).lean();

        if (fileDoc && fileDoc._type === FileTypeEnum.FILE && !fileDoc.preview) {
            // Non-image file literally named "preview" - let the download route handle it
            next();
            return;
        }

        if (!fileDoc || fileDoc._type === FileTypeEnum.FOLDER || !fileDoc.preview) {
            res.status(404).end();
            return;
        }

        sendBlob(req, res, {
            contenthash: fileDoc.preview.contenthash,
            mimetype: fileDoc.preview.mimetype,
            size: fileDoc.preview.size,
            etag: `"${fileDoc._id.toString()}-preview-${fileDoc.updatedAt.getTime()}"`
        });
    } catch (err) {
        handleMediaError(res, err);
    }
};

export const getImageUrl = (hash?: string | null) => hash ? `/media/files/${hash}` : null;

const mediaController = {
    getFileByHash,
    getFileByHashWithName,
    getFilePreviewByHash
};

export default mediaController;
