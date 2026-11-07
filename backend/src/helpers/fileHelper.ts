import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp, { Metadata } from "sharp";
import FileModel, { File } from "../models/File";
import { config } from "../confg";
import FileTypeEnum from "../data/FileTypeEnum";
import { escapeRegex } from "../utils/regexUtils";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import HttpError from "../exceptions/HttpError";
import { formatUserMinimal } from "./userHelper";
import { isInlineSafeMime, isProcessableImageMime, mimeFromFilename } from "../utils/fileTypes";

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
    /** webp/avif encoder effort; lower is faster (webp 0-6, default 4) */
    effort?: number;
    storeOriginal?: boolean;
    /**
     * Store the upload as-is (no re-encode) when it is already a webp within maxWidth/maxHeight
     * and at most this many bytes. Lets clients pre-compress to skip the server-side encode.
     */
    passthroughMaxBytes?: number;
};

export type ImageQualityPreset = "normal" | "hd";

/**
 * Presets for user uploaded post/message images.
 * - normal: good for photos & casual screenshots, ~100-300 KB
 * - hd: keeps small text in screenshots/code readable, ~300 KB-1.5 MB
 * The frontend pre-resizes/encodes to the same settings so the server usually just validates & stores.
 */
export const IMAGE_QUALITY_PRESETS: Record<ImageQualityPreset, { maxDimension: number; quality: number; passthroughMaxBytes: number }> = {
    normal: { maxDimension: 1280, quality: 80, passthroughMaxBytes: 1024 * 1024 },
    hd: { maxDimension: 2560, quality: 90, passthroughMaxBytes: 4 * 1024 * 1024 },
};

/** Max size of non-image files */
export const MAX_RAW_FILE_SIZE = 5 * 1024 * 1024;

const sha256 = (buf: Buffer) =>
    crypto.createHash("sha256").update(new Uint8Array(buf)).digest("hex");

/** Writes a content-addressed blob (no-op if it already exists) and returns its hash */
const writeBlob = async (buffer: Buffer) => {
    const hash = sha256(buffer);
    const absPath = absBlobPathFromHash(hash);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    try {
        await fs.writeFile(absPath, new Uint8Array(buffer), { flag: "wx" });
    } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException)?.code !== "EEXIST") throw e;
    }
    return hash;
};

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

const getWritableTarget = async (virtualPath: string, name: string, session?: mongoose.ClientSession) => {
    const prevDoc = await FileModel.findOne({ path: virtualPath, name }).session(session ?? null);
    if (prevDoc && prevDoc._type === FileTypeEnum.FOLDER) {
        throw new HttpError("Cannot overwrite a folder with a file", 409);
    }
    return prevDoc;
};

const cleanupReplacedBlobs = async (prevDoc: File | null, hash: string, previewHash: string | null, session?: mongoose.ClientSession) => {
    if (prevDoc?._type !== FileTypeEnum.FILE) return;
    if (prevDoc.contenthash && prevDoc.contenthash !== hash) await deleteBlobIfUnreferenced(prevDoc.contenthash, session);
    if (prevDoc.preview?.contenthash && prevDoc.preview.contenthash !== previewHash) await deleteBlobIfUnreferenced(prevDoc.preview.contenthash, session);
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
    effort,
    storeOriginal = false,
    passthroughMaxBytes
}: UploadImageParams, session?: mongoose.ClientSession) => {
    if (!isProcessableImageMime(inputMime)) {
        throw new HttpError("Unsupported image type", 415);
    }

    const prevDoc = await getWritableTarget(virtualPath, name, session);

    let outBuffer: Buffer;
    let mimetype: string;

    let metadata: Metadata;
    try {
        metadata = await sharp(buffer).metadata(); // header only - cheap, also validates the image
    } catch {
        throw new HttpError("Invalid image file", 400);
    }

    const fitsBounds = (!maxWidth || (metadata.width ?? Infinity) <= maxWidth)
        && (!maxHeight || (metadata.height ?? Infinity) <= maxHeight);
    const canPassthrough = passthroughMaxBytes !== undefined
        && metadata.format === "webp"
        && fitsBounds
        && buffer.length <= passthroughMaxBytes
        && (metadata.orientation ?? 1) === 1;

    // GIFs are kept as-is so animations survive
    if (storeOriginal || canPassthrough || metadata.format === "gif") {
        outBuffer = buffer;
        mimetype = metadata.format === "gif" ? "image/gif" : canPassthrough ? "image/webp" : inputMime;
    } else {
        let pipeline = sharp(buffer).rotate();

        if (maxWidth || maxHeight) {
            pipeline = pipeline.resize({ width: maxWidth, height: maxHeight, fit, withoutEnlargement: true });
        }

        switch (outputFormat) {
            case "webp": pipeline = pipeline.webp({ quality, effort }); mimetype = "image/webp"; break;
            case "jpeg": pipeline = pipeline.jpeg({ quality, mozjpeg: false }); mimetype = "image/jpeg"; break;
            case "png": pipeline = pipeline.png(); mimetype = "image/png"; break;
            case "avif": pipeline = pipeline.avif({ quality, effort }); mimetype = "image/avif"; break;
        }

        outBuffer = await pipeline.toBuffer();
    }

    const hash = await writeBlob(outBuffer);

    // Build the thumbnail from the (usually much smaller) output instead of decoding the original again
    const previewBuffer = await sharp(outBuffer).rotate().resize({ width: 128, height: 128, fit: "inside" }).webp({ quality: 60, effort: 2 }).toBuffer();
    const previewHash = await writeBlob(previewBuffer);

    const fileDoc = await FileModel.findOneAndUpdate(
        { path: virtualPath, name },
        { $set: { _type: FileTypeEnum.FILE, author: authorId, mimetype, size: outBuffer.length, contenthash: hash, preview: { contenthash: previewHash, size: previewBuffer.length, mimetype: "image/webp" } } },
        { upsert: true, returnDocument: "after", session }
    );

    await cleanupReplacedBlobs(prevDoc, hash, previewHash, session);

    return fileDoc;
};

export type UploadRawFileParams = {
    authorId: string;
    buffer: Buffer;
    path: string;
    name: string;
    /** Original filename, used for type detection when `name` has no extension */
    originalName?: string;
};

/** Stores any (non-image) file as-is. Served only as a download. */
export const uploadRawFileToBlob = async ({ authorId, buffer, path: virtualPath, name, originalName }: UploadRawFileParams, session?: mongoose.ClientSession) => {
    if (buffer.length > MAX_RAW_FILE_SIZE) {
        throw new HttpError(`File is too large (max ${MAX_RAW_FILE_SIZE / (1024 * 1024)} MB)`, 413);
    }

    // Keep the extension so the type stays recognizable (download name, icon)
    const originalExt = originalName ? path.extname(originalName).toLowerCase() : "";
    if (!path.extname(name) && /^\.[a-z0-9]{1,10}$/.test(originalExt)) {
        name = name.slice(0, 40 - originalExt.length) + originalExt;
    }

    const prevDoc = await getWritableTarget(virtualPath, name, session);

    const hash = await writeBlob(buffer);
    const mimetype = mimeFromFilename(name);

    const fileDoc = await FileModel.findOneAndUpdate(
        { path: virtualPath, name },
        { $set: { _type: FileTypeEnum.FILE, author: authorId, mimetype, size: buffer.length, contenthash: hash, preview: null } },
        { upsert: true, returnDocument: "after", session }
    );

    await cleanupReplacedBlobs(prevDoc, hash, null, session);

    return fileDoc;
};

/**
 * Public URL of a stored file.
 * Images: /media/files/<hash>, other files: /media/files/<hash>/<name> (the name drives download filename & icon).
 */
export const getFileUrl = (file: Pick<File, "contenthash" | "mimetype" | "name">) => {
    if (!file.contenthash) return null;
    if (isInlineSafeMime(file.mimetype)) return `/media/files/${file.contenthash}`;
    return `/media/files/${file.contenthash}/${encodeURIComponent(file.name)}`;
};

export const formatUploadedFile = (fileDoc: File & { _id: Types.ObjectId }) => ({
    id: fileDoc._id,
    name: fileDoc.name,
    mimetype: fileDoc.mimetype,
    size: fileDoc.size,
    updatedAt: fileDoc.updatedAt,
    url: getFileUrl(fileDoc),
    previewUrl: fileDoc.preview ? `/media/files/${fileDoc.contenthash}/preview` : null
});

export const listDirectory = async (virtualPath: string, session?: mongoose.ClientSession) => {
    return FileModel.find({ path: virtualPath })
        .session(session ?? null)
        .sort({ type: "desc", updatedAt: "desc" })
        .populate("author", USER_MINIMAL_FIELDS)
        .lean<(File & { _id: Types.ObjectId } & { author: UserMinimal })[]>();
};

export const formatFileEntry = (file: File & { _id: Types.ObjectId } & { author: UserMinimal }) => {
    return {
        id: file._id,
        author: formatUserMinimal(file.author),
        type: file._type,
        name: file.name,
        mimetype: file.mimetype,
        size: file.size,
        updatedAt: file.updatedAt,
        url: file._type === FileTypeEnum.FILE ? getFileUrl(file) : null,
        previewUrl: (file._type === FileTypeEnum.FILE && file.preview) ? `/media/files/${file.contenthash}/preview` : null
    };
}