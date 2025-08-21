"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressAvatar = exports.safeReadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
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
function compressAvatar({ inputPath, size = 256, quality = 80, }) {
    return __awaiter(this, void 0, void 0, function* () {
        // Load image, auto-rotate, resize
        const image = (0, sharp_1.default)(inputPath)
            .rotate() // fix EXIF orientation
            .resize({ width: size, height: size, fit: "cover" }); // square avatar
        // Detect format from input and compress
        const metadata = yield image.metadata();
        let buffer;
        switch (metadata.format) {
            case "jpeg":
            case "jpg":
                buffer = yield image.jpeg({ quality }).toBuffer();
                break;
            case "png":
                buffer = yield image.png({ compressionLevel: 6 }).toBuffer();
                break;
            case "webp":
                buffer = yield image.webp({ quality }).toBuffer();
                break;
            default:
                throw new Error(`Unsupported image format: ${metadata.format}`);
        }
        return buffer;
    });
}
exports.compressAvatar = compressAvatar;
