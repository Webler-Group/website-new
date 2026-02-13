"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const MulterFileTypeError_1 = __importDefault(require("../exceptions/MulterFileTypeError"));
const confg_1 = require("../confg");
const uploadImage = ({ maxFileSizeBytes = 10 * 1024 * 1024, allowedMimeRegex = /^image\/(png|jpe?g|webp)$/i, } = {}) => {
    return (0, multer_1.default)({
        limits: { fileSize: maxFileSizeBytes },
        fileFilter(_req, file, cb) {
            if (allowedMimeRegex.test(file.mimetype))
                cb(null, true);
            else
                cb(new MulterFileTypeError_1.default("Unsupported image type"));
        },
        storage: multer_1.default.diskStorage({
            destination(_req, _file, cb) {
                const dir = path_1.default.join(confg_1.config.rootDir, "uploads", "tmp");
                if (!fs_1.default.existsSync(dir))
                    fs_1.default.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename(_req, file, cb) {
                // keep extension for temp readability; final storage is handled by helper
                const ext = path_1.default.extname(file.originalname) || ".bin";
                cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
            },
        }),
    });
};
exports.default = uploadImage;
