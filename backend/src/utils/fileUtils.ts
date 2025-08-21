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

interface CompressAvatarOptions {
    inputPath: string;
    size?: number; // max width/height, default 256px
    quality?: number; // compression quality, default 80
}

export async function compressAvatar({
    inputPath,
    size = 256,
    quality = 80,
}: CompressAvatarOptions): Promise<Buffer> {
    // Load image, auto-rotate, resize
    const image = sharp(inputPath)
        .rotate() // fix EXIF orientation
        .resize({ width: size, height: size, fit: "cover" }); // square avatar

    // Detect format from input and compress
    const metadata = await image.metadata();
    let buffer: Buffer;

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
            throw new Error(`Unsupported image format: ${metadata.format}`);
    }

    return buffer;
}
