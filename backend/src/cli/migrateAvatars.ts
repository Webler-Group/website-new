// scripts/migrateAvatars.ts
import path from "path";
import fs from "fs/promises";
import fssync from "fs";
import mongoose from "mongoose";
import { config } from "../confg";
import User from "../models/User";
import { uploadImageToBlob } from "../helpers/fileHelper";
import connectDB from "../config/dbConn";

const isLegacyAvatar = (v: any) => {
    if (!v) return false;
    if (typeof v !== "string") return false;
    if (mongoose.isValidObjectId(v)) return false;
    return /\.(png|jpe?g|webp|avif)$/i.test(v);
};

const mimeFromExt = (filename: string) => {
    const ext = path.extname(filename).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".webp") return "image/webp";
    if (ext === ".avif") return "image/avif";
    return "application/octet-stream";
};

const copyToTmp = async (srcAbs: string) => {
    const tmpDir = path.join(config.rootDir, "uploads", "tmp");
    await fs.mkdir(tmpDir, { recursive: true });

    const tmpAbs = path.join(
        tmpDir,
        `migrate-${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(srcAbs)}`
    );

    await fs.copyFile(srcAbs, tmpAbs);
    return tmpAbs;
};

async function migrate() {
    await connectDB();

    const users = await User.find({ avatarImage: { $ne: null } })
        .select("_id avatarImage")
        .lean();

    let ok = 0;
    let skipped = 0;
    let failed = 0;

    for (const u of users) {
        const legacy = (u as any).avatarImage;

        if (!isLegacyAvatar(legacy)) {
            skipped++;
            continue;
        }

        const userId = String(u._id);
        const srcAbs = path.join(config.rootDir, "uploads", "users", legacy);

        if (!fssync.existsSync(srcAbs)) {
            console.log("missing:", userId, legacy);
            failed++;
            continue;
        }

        try {
            const tmpAbs = await copyToTmp(srcAbs);

            const fileDoc = await uploadImageToBlob({
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

            await User.updateOne({ _id: u._id }, { $set: { avatarImage: fileDoc._id } });

            console.log("migrated:", userId);
            ok++;
        } catch (err) {
            console.log("failed:", userId);
            failed++;
        }
    }

    console.log(`DONE → ok:${ok} skipped:${skipped} failed:${failed}`);
    process.exit(0);
}

migrate();
