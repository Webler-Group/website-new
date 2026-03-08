import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import FileModel, { File } from "../models/File";
import { config } from "../confg";
import FileTypeEnum from "../data/FileTypeEnum";
import { escapeRegex } from "../utils/regexUtils";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import HttpError from "../exceptions/HttpError";

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
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
    }
};

export const deleteBlobIfUnreferenced = async (contenthash: string, session?: mongoose.ClientSession) => {
    const refs = await FileModel.countDocuments({
        $or: [{ contenthash }, { "preview.contenthash": contenthash }]
    }).session(session ?? null);

    if (refs > 0) return;

    const blobPath = absBlobPathFromHash(contenthash);
    await unlinkIfExists(blobPath);
};

export const deleteSingleFile = async (doc: File & { _id: Types.ObjectId }, session?: mongoose.ClientSession) => {
    const mainHash = doc.contenthash;
    const previewHash = doc.preview?.contenthash;

    await FileModel.deleteOne({ _id: doc._id }, { session });

    if (mainHash) await deleteBlobIfUnreferenced(mainHash, session);
    if (previewHash) await deleteBlobIfUnreferenced(previewHash, session);
};

export const deleteEntry = async (virtualPath: string, name: string, session?: mongoose.ClientSession) => {
    const entry = await FileModel.findOne({ path: virtualPath, name }).session(session ?? null);
    if (!entry) return;

    if (entry._type === FileTypeEnum.FILE) {
        await deleteSingleFile(entry, session);
        return;
    }

    const folderFull = virtualPath ? `${virtualPath}/${name}` : name;
    const escaped = escapeRegex(folderFull);

    const children = await FileModel.find({ path: { $regex: `^${escaped}(/|$)` } }).session(session ?? null);

    for (const child of children) {
        if (child._type === FileTypeEnum.FILE) {
            await deleteSingleFile(child, session);
        } else {
            await FileModel.deleteOne({ _id: child._id }, { session });
        }
    }

    await FileModel.deleteOne({ _id: entry._id }, { session });
};

export const moveEntry = async (
    oldPath: string,
    oldName: string,
    newPath: string,
    newName: string,
    session?: mongoose.ClientSession
) => {
    const entry = await FileModel.findOne({ path: oldPath, name: oldName }).session(session ?? null);
    if (!entry) throw new HttpError("Entry not found", 404);

    const exists = await FileModel.exists({ path: newPath, name: newName }).session(session ?? null);
    if (exists) throw new HttpError("Target already exists", 409);

    if (entry._type === FileTypeEnum.FOLDER) {
        const oldFull = oldPath ? `${oldPath}/${oldName}` : oldName;
        const newFull = newPath ? `${newPath}/${newName}` : newName;
        const escaped = escapeRegex(oldFull);
        const children = await FileModel.find({ path: { $regex: `^${escaped}(/|$)` } }).session(session ?? null);

        for (const child of children) {
            const updatedPath = child.path.replace(oldFull, newFull);
            await FileModel.updateOne({ _id: child._id }, { $set: { path: updatedPath } }, { session });
        }
    }

    entry.path = newPath;
    entry.name = newName;
    await entry.save({ session });
};

export const createFolder = async (authorId: string, virtualPath: string, name: string, session?: mongoose.ClientSession) => {
    const [doc] = await FileModel.create([{
        author: authorId,
        path: virtualPath,
        name,
        _type: FileTypeEnum.FOLDER
    }], { session });
    return doc;
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
}: UploadImageParams, session?: mongoose.ClientSession) => {
    if (!/^image\/(png|jpe?g|webp|avif)$/i.test(inputMime)) {
        throw new HttpError("Unsupported image type", 415);
    }

    const prevDoc = await FileModel.findOne({ path: virtualPath, name }).session(session ?? null);

    if (prevDoc && prevDoc._type === FileTypeEnum.FOLDER) {
        throw new HttpError("Cannot overwrite a folder with a file", 409);
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

    try {
        await fs.writeFile(absPath, new Uint8Array(outBuffer), { flag: "wx" });
    } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException)?.code !== "EEXIST") throw e;
    }

    const previewBuffer = await sharp(buffer).rotate().resize({ width: 128, height: 128, fit: "inside" }).webp({ quality: 60 }).toBuffer();
    const previewHash = sha256(previewBuffer);
    const previewPath = absBlobPathFromHash(previewHash);
    await fs.mkdir(path.dirname(previewPath), { recursive: true });

    try {
        await fs.writeFile(previewPath, new Uint8Array(previewBuffer), { flag: "wx" });
    } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException)?.code !== "EEXIST") throw e;
    }

    const fileDoc = await FileModel.findOneAndUpdate(
        { path: virtualPath, name },
        { $set: { _type: FileTypeEnum.FILE, author: authorId, mimetype, size: outBuffer.length, contenthash: hash, preview: { contenthash: previewHash, size: previewBuffer.length, mimetype: "image/webp" } } },
        { upsert: true, new: true, session }
    );

    if (prevDoc?._type === FileTypeEnum.FILE) {
        if (prevDoc.contenthash !== hash) await deleteBlobIfUnreferenced(prevDoc.contenthash!, session);
        if (prevDoc.preview?.contenthash && prevDoc.preview.contenthash !== previewHash) await deleteBlobIfUnreferenced(prevDoc.preview.contenthash, session);
    }

    return fileDoc;
};

export const listDirectory = async (virtualPath: string, session?: mongoose.ClientSession) => {
    return FileModel.find({ path: virtualPath })
        .session(session ?? null)
        .sort({ type: "desc", updatedAt: "desc" })
        .populate<{ author: UserMinimal & { _id: Types.ObjectId } }>("author", USER_MINIMAL_FIELDS)
        .lean();
};