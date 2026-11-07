export const downloadJsonFile = (filename: string, data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
};

export const formatSize = (bytes?: number): string | null => {
    if (bytes == null) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ---------------------------------------------------------------------------
// File kinds (simple extension based detection)
// ---------------------------------------------------------------------------

export type FileKind = "image" | "pdf" | "archive" | "code" | "text" | "audio" | "video" | "document" | "spreadsheet" | "presentation" | "other";

const EXTENSION_KINDS: Record<string, FileKind> = {
    png: "image", jpg: "image", jpeg: "image", webp: "image", avif: "image", gif: "image", svg: "image", bmp: "image",
    pdf: "pdf",
    zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive", tgz: "archive",
    txt: "text", md: "text", log: "text", csv: "spreadsheet",
    js: "code", jsx: "code", ts: "code", tsx: "code", py: "code", java: "code", c: "code", h: "code", cpp: "code", hpp: "code",
    cs: "code", go: "code", rs: "code", rb: "code", php: "code", kt: "code", swift: "code", lua: "code", sh: "code",
    html: "code", css: "code", json: "code", xml: "code", yml: "code", yaml: "code", sql: "code",
    mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", m4a: "audio",
    mp4: "video", webm: "video", mov: "video", mkv: "video", avi: "video",
    doc: "document", docx: "document", odt: "document", rtf: "document",
    xls: "spreadsheet", xlsx: "spreadsheet", ods: "spreadsheet",
    ppt: "presentation", pptx: "presentation", odp: "presentation",
};

export const getFileExtension = (name: string) => {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

export const getFileKind = (name: string, mimetype?: string): FileKind => {
    const byExt = EXTENSION_KINDS[getFileExtension(name)];
    if (byExt) return byExt;
    if (mimetype) {
        if (mimetype.startsWith("image/")) return "image";
        if (mimetype.startsWith("audio/")) return "audio";
        if (mimetype.startsWith("video/")) return "video";
        if (mimetype.startsWith("text/")) return "text";
        if (mimetype === "application/pdf") return "pdf";
    }
    return "other";
};

/** Raster images the server compresses and serves inline */
export const isUploadableImage = (file: File) => /^image\/(png|jpe?g|webp|avif|gif)$/i.test(file.type);

/** Max size of non-image uploads (mirrors backend MAX_RAW_FILE_SIZE) */
export const MAX_FILE_UPLOAD_SIZE = 5 * 1024 * 1024;
/** Max size of image uploads (mirrors backend multer limit) */
export const MAX_IMAGE_UPLOAD_SIZE = 10 * 1024 * 1024;

/** Turns any filename into one accepted by the backend: [a-zA-Z0-9._-], max 40 chars, extension kept */
export const sanitizeUploadName = (name: string) => {
    const ext = getFileExtension(name);
    const base = (ext ? name.slice(0, -(ext.length + 1)) : name)
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^[._]+|_+$/g, "") || "file";
    const suffix = ext && /^[a-z0-9]{1,10}$/.test(ext) ? "." + ext : "";
    return base.slice(0, 40 - suffix.length) + suffix;
};

// ---------------------------------------------------------------------------
// Uploaded media URLs
//   /media/files/<hash>            -> image (rendered inline)
//   /media/files/<hash>/<filename> -> any other file (download)
// ---------------------------------------------------------------------------

const MEDIA_IMAGE_REGEX = /^\/media\/files\/[a-f0-9]+(\.[a-z0-9]+)?$/i;
const MEDIA_FILE_REGEX = /^\/media\/files\/[a-f0-9]+\/([a-zA-Z0-9._%-]+)$/i;

export type MediaUrlInfo = { type: "image" } | { type: "file"; name: string; kind: FileKind };

/** Recognizes uploaded media by its path (pass a relative path, e.g. "/media/files/abc") */
export const parseMediaUrl = (path: string): MediaUrlInfo | null => {
    if (MEDIA_IMAGE_REGEX.test(path)) return { type: "image" };
    const match = MEDIA_FILE_REGEX.exec(path);
    if (match && match[1] !== "preview") {
        let name = match[1];
        try { name = decodeURIComponent(name); } catch { /* keep raw */ }
        return { type: "file", name, kind: getFileKind(name) };
    }
    return null;
};

// ---------------------------------------------------------------------------
// Client side image pre-compression
// Resizing/encoding in the browser keeps upload requests small and lets the server
// store the result without re-encoding (see IMAGE_QUALITY_PRESETS in backend fileHelper).
// ---------------------------------------------------------------------------

export type ImageQualityPreset = "normal" | "hd";

export const IMAGE_QUALITY_PRESETS: Record<ImageQualityPreset, { maxDimension: number; quality: number; label: string; description: string }> = {
    normal: { maxDimension: 1280, quality: 0.8, label: "Normal", description: "Up to 1280px, smaller file. Good for photos." },
    hd: { maxDimension: 2560, quality: 0.9, label: "HD", description: "Up to 2560px. Keeps text in screenshots readable." },
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
    new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));

/**
 * Downscales and encodes an image to webp with the preset settings.
 * Returns the original file when it can't be processed (unsupported decoder, GIF animation, ...)
 * or when processing wouldn't make it smaller - the server then handles it.
 */
export const prepareImageForUpload = async (file: File, preset: ImageQualityPreset): Promise<File> => {
    if (!isUploadableImage(file) || file.type === "image/gif") return file;
    const { maxDimension, quality } = IMAGE_QUALITY_PRESETS[preset];

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
        return file;
    }

    try {
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bitmap, 0, 0, width, height);

        const blob = await canvasToBlob(canvas, "image/webp", quality);
        // Some browsers (older Safari) silently fall back to PNG - let the server encode instead
        if (!blob || blob.type !== "image/webp") return file;
        if (scale === 1 && file.type === "image/webp" && blob.size >= file.size) return file;

        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([blob], baseName + ".webp", { type: "image/webp" });
    } finally {
        bitmap.close();
    }
};
