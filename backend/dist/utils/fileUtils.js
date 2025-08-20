"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeReadFile = void 0;
const fs_1 = __importDefault(require("fs"));
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
