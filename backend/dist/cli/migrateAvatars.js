"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/migrateAvatars.ts
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const mongoose_1 = __importDefault(require("mongoose"));
const confg_1 = require("../confg");
const User_1 = __importDefault(require("../models/User"));
const fileHelper_1 = require("../helpers/fileHelper");
const dbConn_1 = __importDefault(require("../config/dbConn"));
const isLegacyAvatar = (v) => {
    if (!v)
        return false;
    if (typeof v !== "string")
        return false;
    if (mongoose_1.default.isValidObjectId(v))
        return false;
    return /\.(png|jpe?g|webp|avif)$/i.test(v);
};
const mimeFromExt = (filename) => {
    const ext = path_1.default.extname(filename).toLowerCase();
    if (ext === ".png")
        return "image/png";
    if (ext === ".jpg" || ext === ".jpeg")
        return "image/jpeg";
    if (ext === ".webp")
        return "image/webp";
    if (ext === ".avif")
        return "image/avif";
    return "application/octet-stream";
};
const copyToTmp = async (srcAbs) => {
    const tmpDir = path_1.default.join(confg_1.config.rootDir, "uploads", "tmp");
    await promises_1.default.mkdir(tmpDir, { recursive: true });
    const tmpAbs = path_1.default.join(tmpDir, `migrate-${Date.now()}-${Math.random().toString(16).slice(2)}${path_1.default.extname(srcAbs)}`);
    await promises_1.default.copyFile(srcAbs, tmpAbs);
    return tmpAbs;
};
async function migrate() {
    await (0, dbConn_1.default)();
    const users = await User_1.default.find({ avatarImage: { $ne: null } })
        .select("_id avatarImage")
        .lean();
    let ok = 0;
    let skipped = 0;
    let failed = 0;
    for (const u of users) {
        const legacy = u.avatarImage;
        if (!isLegacyAvatar(legacy)) {
            skipped++;
            continue;
        }
        const userId = String(u._id);
        const srcAbs = path_1.default.join(confg_1.config.rootDir, "uploads", "users", legacy);
        if (!fs_1.default.existsSync(srcAbs)) {
            console.log("missing:", userId, legacy);
            failed++;
            continue;
        }
        try {
            const tmpAbs = await copyToTmp(srcAbs);
            const fileDoc = await (0, fileHelper_1.uploadImageToBlob)({
                authorId: userId,
                tempPath: tmpAbs,
                inputMime: mimeFromExt(legacy),
                path: `users/${userId}/avatar`,
                name: "avatar",
                maxWidth: 256,
                maxHeight: 256,
                fit: "cover",
                outputFormat: "webp",
                quality: 82,
            });
            await User_1.default.updateOne({ _id: u._id }, { $set: { avatarImage: fileDoc._id } });
            console.log("migrated:", userId);
            ok++;
        }
        catch (err) {
            console.log("failed:", userId);
            failed++;
        }
    }
    console.log(`DONE → ok:${ok} skipped:${skipped} failed:${failed}`);
    process.exit(0);
}
migrate();
