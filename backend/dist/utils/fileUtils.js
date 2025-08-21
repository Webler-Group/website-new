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
exports.compressImageToSize = exports.safeReadFile = void 0;
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
function compressImageToSize(inputPath, mimetype, targetSizeInBytes) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let quality = 80;
        let buffer;
        const format = (_a = mimetype.split('/')[1]) === null || _a === void 0 ? void 0 : _a.toLowerCase(); // e.g., jpeg, png, gif
        const sharpInstance = (0, sharp_1.default)(inputPath).resize({ width: 1024, withoutEnlargement: true });
        while (quality >= 10) {
            switch (format) {
                case "jpeg":
                case "jpg":
                    buffer = yield sharpInstance.clone().jpeg({ quality }).toBuffer();
                    break;
                case "png":
                    buffer = yield sharpInstance.clone().png({ quality }).toBuffer();
                    break;
                case "webp":
                    buffer = yield sharpInstance.clone().webp({ quality }).toBuffer();
                    break;
                case "gif":
                    // Sharp doesn't support animated GIFs well, only static
                    // Could convert first frame to PNG or throw error
                    throw new Error("GIF compression is not supported by sharp. Consider converting to PNG.");
                default:
                    throw new Error(`Unsupported image format: ${format}`);
            }
            if (buffer.length <= targetSizeInBytes) {
                return buffer;
            }
            quality -= 10;
        }
        throw new Error(`Unable to compress image to under ${targetSizeInBytes} bytes`);
    });
}
exports.compressImageToSize = compressImageToSize;
