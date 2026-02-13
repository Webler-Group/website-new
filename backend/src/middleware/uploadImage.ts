import multer from "multer";
import fs from "fs";
import path from "path";
import MulterFileTypeError from "../exceptions/MulterFileTypeError";
import { config } from "../confg";

type UploadImageOptions = {
    maxFileSizeBytes?: number;
    allowedMimeRegex?: RegExp; // e.g. /^image\/(png|jpe?g|webp)$/i
};

const uploadImage = ({
    maxFileSizeBytes = 10 * 1024 * 1024,
    allowedMimeRegex = /^image\/(png|jpe?g|webp)$/i,
}: UploadImageOptions = {}) => {
    return multer({
        limits: { fileSize: maxFileSizeBytes },
        fileFilter(_req, file, cb) {
            if (allowedMimeRegex.test(file.mimetype)) cb(null, true);
            else cb(new MulterFileTypeError("Unsupported image type"));
        },
        storage: multer.diskStorage({
            destination(_req, _file, cb) {
                const dir = path.join(config.rootDir, "uploads", "tmp");
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename(_req, file, cb) {
                // keep extension for temp readability; final storage is handled by helper
                const ext = path.extname(file.originalname) || ".bin";
                cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
            },
        }),
    });
}

export default uploadImage;