import fs from "fs";

export function safeReadFile(filePath: string, maxSaveSize: number): string {
    if (!fs.existsSync(filePath)) return "";
    const stats = fs.statSync(filePath);
    if (stats.size > maxSaveSize) {
        const fd = fs.openSync(filePath, "r");
        const buffer = new Uint8Array(maxSaveSize);
        fs.readSync(fd, buffer, 0, maxSaveSize, 0);
        fs.closeSync(fd);
        return new TextDecoder('utf-8').decode(buffer) + "[Output truncated]";
    } else {
        return fs.readFileSync(filePath, "utf-8");
    }
}