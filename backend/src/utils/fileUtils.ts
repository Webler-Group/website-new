import fs from "fs";

export function safeReadFile(filePath: string, maxSaveSize: number): string {
    if (!fs.existsSync(filePath)) return "";
    const stats = fs.statSync(filePath);
    if (stats.size > maxSaveSize) {
        // Read only the first MAX_SAVE_SIZE bytes and append truncation message
        const fd = fs.openSync(filePath, "r");
        const buffer = Buffer.alloc(maxSaveSize);
        fs.readSync(fd, buffer, 0, maxSaveSize, 0);
        fs.closeSync(fd);
        return buffer.toString("utf-8") + "[Output truncated]";
    } else {
        return fs.readFileSync(filePath, "utf-8");
    }
}