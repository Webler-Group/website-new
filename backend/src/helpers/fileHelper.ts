// helpers/fileHelper.ts
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import File from "../models/File";
import { config } from "../confg";
import mongoose from "mongoose";

type ImageFit = "cover" | "inside";

export type UploadImageParams = {
    authorId: string;
    buffer: Buffer;
    inputMime: string;

    path: string;
    name: string;

    maxWidth: number;
    maxHeight: number;
    fit: ImageFit;

    outputFormat?: "webp" | "jpeg" | "png" | "avif";
    quality?: number;
};

const sha256 = (buf: Buffer) => crypto.createHash("sha256").update(new Uint8Array(buf)).digest("hex");

export const absBlobPathFromHash = (hash: string) => {
    return path.join(
        config.rootDir,
        "uploads",
        "blobs",
        hash.slice(0, 2),
        hash.slice(2, 4),
        hash
    );
};

const unlinkIfExists = async (p: string) => {
    try {
        await fs.unlink(p);
    } catch (err: any) {
        if (err?.code !== "ENOENT") {
            throw err;
        }
    }
};

export const deleteBlobIfUnreferenced = async (contenthash: string) => {
    const refs = await File.countDocuments({ contenthash });
    if (refs > 0) return;

    const blobPath = absBlobPathFromHash(contenthash);
    await unlinkIfExists(blobPath);
};


export const deleteFile = async (fileId: mongoose.Types.ObjectId | string) => {
    const doc = await File.findById(fileId).select("contenthash");
    if (!doc) return;

    const oldHash = doc.contenthash;
    await File.deleteOne({ _id: doc._id });

    await deleteBlobIfUnreferenced(oldHash);
};

export const deleteFileByVirtualPath = async (virtualPath: string, name: string) => {
    const doc = await File.findOne({ path: virtualPath, name }).select("contenthash");
    if (!doc) return;

    const oldHash = doc.contenthash;
    await File.deleteOne({ _id: doc._id });

    await deleteBlobIfUnreferenced(oldHash);
};

export const uploadImageToBlob = async ({
    authorId,
    buffer,
    inputMime,
    path: virtualPath,
    name,
    maxWidth,
    maxHeight,
    fit,
    outputFormat = "webp",
    quality = 82,
}: UploadImageParams) => {

    if (!/^image\/(png|jpe?g|webp|avif)$/i.test(inputMime)) {
        throw Object.assign(new Error("Unsupported image type"), { status: 415 });
    }

    const prevDoc = await File.findOne({
        path: virtualPath,
        name
    }).select("contenthash");

    try {
        let pipeline = sharp(buffer)
            .rotate()
            .resize({
                width: maxWidth,
                height: maxHeight,
                fit,
                withoutEnlargement: true,
            });

        switch (outputFormat) {
            case "webp":
                pipeline = pipeline.webp({ quality, smartSubsample: true });
                break;
            case "jpeg":
                pipeline = pipeline.jpeg({ quality, mozjpeg: true });
                break;
            case "png":
                pipeline = pipeline.png({ compressionLevel: 8 });
                break;
            case "avif":
                pipeline = pipeline.avif({ quality });
                break;
        }

        const outBuffer = await pipeline.toBuffer();
        const hash = sha256(outBuffer);
        const absFinalPath = absBlobPathFromHash(hash);

        await fs.mkdir(path.dirname(absFinalPath), { recursive: true });

        try {
            await fs.writeFile(absFinalPath, new Uint8Array(outBuffer), { flag: "wx" });
        } catch (e: any) {
            if (e?.code !== "EEXIST") throw e;
        }

        const mimetype =
            outputFormat === "webp"
                ? "image/webp"
                : outputFormat === "png"
                    ? "image/png"
                    : outputFormat === "avif"
                        ? "image/avif"
                        : "image/jpeg";

        const fileDoc = await File.findOneAndUpdate(
            { path: virtualPath, name },
            {
                $set: {
                    author: authorId,
                    mimetype,
                    size: outBuffer.length,
                    contenthash: hash,
                },
                $setOnInsert: {
                    path: virtualPath,
                    name,
                },
            },
            { upsert: true, new: true }
        );

        if (prevDoc && prevDoc.contenthash !== hash) {
            await deleteBlobIfUnreferenced(prevDoc.contenthash);
        }

        return fileDoc;

    } catch (err) {
        throw err;
    }
};

