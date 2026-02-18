import multer from "multer";
import MulterFileTypeError from "../exceptions/MulterFileTypeError";

type UploadImageOptions = {
    maxFileSizeBytes?: number;
    allowedMimeRegex?: RegExp;
};

const uploadImage = ({
    maxFileSizeBytes = 10 * 1024 * 1024,
    allowedMimeRegex = /^image\/(png|jpe?g|webp)$/i,
}: UploadImageOptions = {}) => {
    return multer({
        storage: multer.memoryStorage(),

        limits: {
            fileSize: maxFileSizeBytes,
            files: 1,
        },

        fileFilter(_req, file, cb) {
            if (allowedMimeRegex.test(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new MulterFileTypeError("Unsupported image type"));
            }
        },
    });
};

export default uploadImage;
