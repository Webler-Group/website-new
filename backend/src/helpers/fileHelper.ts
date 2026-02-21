import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import File from "../models/File";
import { config } from "../confg";
import FileTypeEnum from "../data/FileTypeEnum";
import { escapeRegex } from "../utils/regexUtils";

type ImageFit = "cover" | "inside";

export type UploadImageParams = {
    authorId: string;
    buffer: Buffer;
    inputMime: string;
    path: string;
    name: string;
    maxWidth?: number;
    maxHeight?: number;
    fit?: ImageFit;
    outputFormat?: "webp" | "jpeg" | "png" | "avif";
    quality?: number;
    storeOriginal?: boolean;
};

const sha256 = (buf: Buffer) =>
    crypto.createHash("sha256").update(new Uint8Array(buf)).digest("hex");

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
        if (err?.code !== "ENOENT") throw err;
    }
};

export const deleteBlobIfUnreferenced = async (contenthash: string) => {
    const refs = await File.countDocuments({
        $or: [{ contenthash }, { "preview.contenthash": contenthash }]
    });

    if (refs > 0) return;

    const blobPath = absBlobPathFromHash(contenthash);
    await unlinkIfExists(blobPath);
};

const deleteSingleFile = async (doc: any) => {
    const mainHash = doc.contenthash;
    const previewHash = doc.preview?.contenthash;

    await File.deleteOne({ _id: doc._id });

    if (mainHash) await deleteBlobIfUnreferenced(mainHash);
    if (previewHash) await deleteBlobIfUnreferenced(previewHash);
};

export const deleteEntry = async (virtualPath: string, name: string) => {
    const entry = await File.findOne({ path: virtualPath, name });
    if (!entry) return;

    if (entry._type === FileTypeEnum.FILE) {
        await deleteSingleFile(entry);
        return;
    }

    const folderFull = virtualPath ? `${virtualPath}/${name}` : name;
    const escaped = escapeRegex(folderFull);

    const children = await File.find({ path: { $regex: `^${escaped}` } });

    for (const child of children) {
        if (child._type === FileTypeEnum.FILE) {
            await deleteSingleFile(child);
        } else {
            await File.deleteOne({ _id: child._id });
        }
    }

    await File.deleteOne({ _id: entry._id });
};

export const moveEntry = async (
    oldPath: string,
    oldName: string,
    newPath: string,
    newName: string
) => {
    const entry = await File.findOne({ path: oldPath, name: oldName });
    if (!entry) throw new Error("Entry not found");

    const exists = await File.exists({ path: newPath, name: newName });
    if (exists) throw new Error("Target already exists");

    if (entry._type === FileTypeEnum.FOLDER) {
        const oldFull = oldPath ? `${oldPath}/${oldName}` : oldName;
        const newFull = newPath ? `${newPath}/${newName}` : newName;
        const escaped = escapeRegex(oldFull);
        const children = await File.find({ path: { $regex: `^${escaped}(/|$)` } });

        for (const child of children) {
            const updatedPath = child.path.replace(oldFull, newFull);
            await File.updateOne({ _id: child._id }, { $set: { path: updatedPath } });
        }
    }

    entry.path = newPath;
    entry.name = newName;
    await entry.save();
};

export const createFolder = async (authorId: string, virtualPath: string, name: string) => {
    return File.create({
        author: authorId,
        path: virtualPath,
        name,
        _type: FileTypeEnum.FOLDER
    });
};

export const uploadImageToBlob = async ({
    authorId,
    buffer,
    inputMime,
    path: virtualPath,
    name,
    maxWidth,
    maxHeight,
    fit = "inside",
    outputFormat = "webp",
    quality = 82,
    storeOriginal = false
}: UploadImageParams) => {
    if (!/^image\/(png|jpe?g|webp|avif)$/i.test(inputMime)) {
        throw Object.assign(new Error("Unsupported image type"), { status: 415 });
    }

    const prevDoc = await File.findOne({ path: virtualPath, name });

    if (prevDoc && prevDoc._type === FileTypeEnum.FOLDER) {
        throw Object.assign(
            new Error("Cannot overwrite a folder with a file"),
            { status: 409 }
        );
    }

    let outBuffer: Buffer;
    let mimetype: string;

    if (storeOriginal) {
        outBuffer = buffer;
        mimetype = inputMime;
    } else {
        let pipeline = sharp(buffer).rotate();

        if (maxWidth || maxHeight) {
            pipeline = pipeline.resize({ width: maxWidth, height: maxHeight, fit, withoutEnlargement: true });
        }

        switch (outputFormat) {
            case "webp": pipeline = pipeline.webp({ quality }); mimetype = "image/webp"; break;
            case "jpeg": pipeline = pipeline.jpeg({ quality }); mimetype = "image/jpeg"; break;
            case "png": pipeline = pipeline.png(); mimetype = "image/png"; break;
            case "avif": pipeline = pipeline.avif({ quality }); mimetype = "image/avif"; break;
        }

        outBuffer = await pipeline.toBuffer();
    }

    const hash = sha256(outBuffer);
    const absPath = absBlobPathFromHash(hash);
    await fs.mkdir(path.dirname(absPath), { recursive: true });

    try { await fs.writeFile(absPath, new Uint8Array(outBuffer), { flag: "wx" }); } catch (e: any) { if (e?.code !== "EEXIST") throw e; }

    const previewBuffer = await sharp(buffer).rotate().resize({ width: 128, height: 128, fit: "inside" }).webp({ quality: 60 }).toBuffer();
    const previewHash = sha256(previewBuffer);
    const previewPath = absBlobPathFromHash(previewHash);
    await fs.mkdir(path.dirname(previewPath), { recursive: true });

    try { await fs.writeFile(previewPath, new Uint8Array(previewBuffer), { flag: "wx" }); } catch (e: any) { if (e?.code !== "EEXIST") throw e; }

    const fileDoc = await File.findOneAndUpdate(
        { path: virtualPath, name },
        { $set: { _type: FileTypeEnum.FILE, author: authorId, mimetype, size: outBuffer.length, contenthash: hash, preview: { contenthash: previewHash, size: previewBuffer.length, mimetype: "image/webp" } } },
        { upsert: true, new: true }
    );

    if (prevDoc?._type === FileTypeEnum.FILE) {
        if (prevDoc.contenthash !== hash) await deleteBlobIfUnreferenced(prevDoc.contenthash!);
        if (prevDoc.preview?.contenthash && prevDoc.preview.contenthash !== previewHash) await deleteBlobIfUnreferenced(prevDoc.preview.contenthash);
    }

    return fileDoc;
};

export const listDirectory = async (virtualPath: string) => {
    return File.find({ path: virtualPath }).sort({ type: "desc", updatedAt: "desc" });
};
