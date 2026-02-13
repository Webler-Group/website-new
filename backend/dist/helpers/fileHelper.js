"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageToBlob = exports.deleteFileByVirtualPath = exports.deleteFile = exports.deleteBlobIfUnreferenced = exports.absBlobPathFromHash = void 0;
// helpers/fileHelper.ts
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const File_1 = __importDefault(require("../models/File"));
const confg_1 = require("../confg");
const sha256 = (buf) => crypto_1.default.createHash("sha256").update(new Uint8Array(buf)).digest("hex");
const absBlobPathFromHash = (hash) => {
    return path_1.default.join(confg_1.config.rootDir, "uploads", "blobs", hash.slice(0, 2), hash.slice(2, 4), hash);
};
exports.absBlobPathFromHash = absBlobPathFromHash;
const unlinkIfExists = async (p) => {
    try {
        await promises_1.default.unlink(p);
    }
    catch (err) {
        if (err?.code !== "ENOENT") {
            throw err;
        }
    }
};
const deleteBlobIfUnreferenced = async (contenthash) => {
    const refs = await File_1.default.countDocuments({ contenthash });
    if (refs > 0)
        return;
    const blobPath = (0, exports.absBlobPathFromHash)(contenthash);
    await unlinkIfExists(blobPath);
};
exports.deleteBlobIfUnreferenced = deleteBlobIfUnreferenced;
const deleteFile = async (fileId) => {
    const doc = await File_1.default.findById(fileId).select("contenthash");
    if (!doc)
        return;
    const oldHash = doc.contenthash;
    await File_1.default.deleteOne({ _id: doc._id });
    await (0, exports.deleteBlobIfUnreferenced)(oldHash);
};
exports.deleteFile = deleteFile;
const deleteFileByVirtualPath = async (virtualPath, name) => {
    const doc = await File_1.default.findOne({ path: virtualPath, name }).select("contenthash");
    if (!doc)
        return;
    const oldHash = doc.contenthash;
    await File_1.default.deleteOne({ _id: doc._id });
    await (0, exports.deleteBlobIfUnreferenced)(oldHash);
};
exports.deleteFileByVirtualPath = deleteFileByVirtualPath;
const uploadImageToBlob = async ({ authorId, tempPath, inputMime, path: virtualPath, name, maxWidth, maxHeight, fit, outputFormat = "webp", quality = 82, }) => {
    if (!/^image\/(png|jpe?g|webp|avif)$/i.test(inputMime)) {
        await unlinkIfExists(tempPath);
        throw Object.assign(new Error("Unsupported image type"), { status: 415 });
    }
    const prevDoc = await File_1.default.findOne({ path: virtualPath, name }).select("contenthash");
    try {
        let pipeline = (0, sharp_1.default)(tempPath).rotate().resize({
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
        const absFinalPath = (0, exports.absBlobPathFromHash)(hash);
        await promises_1.default.mkdir(path_1.default.dirname(absFinalPath), { recursive: true });
        try {
            await promises_1.default.writeFile(absFinalPath, new Uint8Array(outBuffer), { flag: "wx" });
        }
        catch (e) {
            if (e?.code !== "EEXIST")
                throw e;
        }
        const mimetype = outputFormat === "webp"
            ? "image/webp"
            : outputFormat === "png"
                ? "image/png"
                : outputFormat === "avif"
                    ? "image/avif"
                    : "image/jpeg";
        const fileDoc = await File_1.default.findOneAndUpdate({ path: virtualPath, name }, {
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
        }, { upsert: true, new: true });
        if (prevDoc && prevDoc.contenthash !== hash) {
            await (0, exports.deleteBlobIfUnreferenced)(prevDoc.contenthash);
        }
        await unlinkIfExists(tempPath);
        return fileDoc;
    }
    catch (err) {
        await unlinkIfExists(tempPath);
        throw err;
    }
};
exports.uploadImageToBlob = uploadImageToBlob;
