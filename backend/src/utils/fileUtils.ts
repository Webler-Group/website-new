import fs from "fs";
import sharp from "sharp";

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

export async function compressImageToSize(
    inputPath: string,
    mimetype: string,
    targetSizeInBytes: number
): Promise<Buffer> {
    let quality = 80;
    let buffer: Buffer;

    const format = mimetype.split('/')[1]?.toLowerCase(); // e.g., jpeg, png, gif
    const sharpInstance = sharp(inputPath).resize({ width: 1024, withoutEnlargement: true });

    while (quality >= 10) {
        switch (format) {
            case "jpeg":
            case "jpg":
                buffer = await sharpInstance.clone().jpeg({ quality }).toBuffer();
                break;
            case "png":
                buffer = await sharpInstance.clone().png({ quality }).toBuffer();
                break;
            case "webp":
                buffer = await sharpInstance.clone().webp({ quality }).toBuffer();
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
}
