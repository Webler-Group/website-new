import path from "path";

/** Raster images we process with sharp and serve inline. Everything else is served as a download. */
export const IMAGE_MIME_REGEX = /^image\/(png|jpe?g|webp|avif|gif)$/i;

export const isProcessableImageMime = (mime: string) => IMAGE_MIME_REGEX.test(mime);

/** Mimetypes that are safe to render inline in the browser (no script execution possible) */
const INLINE_SAFE_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"]);

export const isInlineSafeMime = (mime: string | undefined | null) => !!mime && INLINE_SAFE_MIMES.has(mime.toLowerCase());

const EXTENSION_MIMES: Record<string, string> = {
    // documents
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".ods": "application/vnd.oasis.opendocument.spreadsheet",
    ".odp": "application/vnd.oasis.opendocument.presentation",
    // archives
    ".zip": "application/zip",
    ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
    // media
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".svg": "image/svg+xml",
};

/**
 * Simple, extension based mimetype detection. The client supplied mimetype is not trusted;
 * since non-image files are always served as attachments with nosniff, this is only informational.
 */
export const mimeFromFilename = (filename: string): string => {
    const ext = path.extname(filename).toLowerCase();
    return EXTENSION_MIMES[ext] ?? "application/octet-stream";
};

/** Sanitizes a name for use in a Content-Disposition header */
export const toDownloadFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
