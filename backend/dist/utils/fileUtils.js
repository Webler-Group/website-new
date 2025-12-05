"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressAvatar = exports.safeReadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const MulterFileTypeError_1 = __importDefault(require("../exceptions/MulterFileTypeError"));
function safeReadFile(filePath, maxSaveSize) {
    if (!fs_1.default.existsSync(filePath))
        return "";
    const stats = fs_1.default.statSync(filePath);
    if (stats.size > maxSaveSize) {
        const fd = fs_1.default.openSync(filePath, "r");
        const buffer = new Uint8Array(maxSaveSize);
        fs_1.default.readSync(fd, buffer, 0, maxSaveSize, 0);
        fs_1.default.closeSync(fd);
        return new TextDecoder('utf-8').decode(buffer) + "[Output truncated]";
    }
    else {
        return fs_1.default.readFileSync(filePath, "utf-8");
    }
}
exports.safeReadFile = safeReadFile;
async function compressAvatar({ inputPath, size = 256, quality = 80, }) {
    // Load image, auto-rotate, resize
    const image = (0, sharp_1.default)(inputPath)
        .rotate() // fix EXIF orientation
        .resize({ width: size, height: size, fit: "cover" }); // square avatar
    // Detect format from input and compress
    const metadata = await image.metadata();
    let buffer;
    switch (metadata.format) {
        case "jpeg":
        case "jpg":
            buffer = await image.jpeg({ quality }).toBuffer();
            break;
        case "png":
            buffer = await image.png({ compressionLevel: 6 }).toBuffer();
            break;
        case "webp":
            buffer = await image.webp({ quality }).toBuffer();
            break;
        default:
            throw new MulterFileTypeError_1.default(`Unsupported image format: ${metadata.format}`);
    }
    return buffer;
}
exports.compressAvatar = compressAvatar;
