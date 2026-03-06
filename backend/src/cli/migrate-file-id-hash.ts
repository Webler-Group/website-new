import connectDB from "../config/dbConn";
import mongoose, { Document, InferSchemaType, Model, Schema, model } from "mongoose";
import LessonNode from "../models/LessonNode";
import Challenge from "../models/Challenge";
import Post from "../models/Post";
import Course from "../models/Course";
import User from "../models/User";
import File from "../models/File";

// ---------------------------------------------------------------------------
// Inline lightweight model definitions (raw collection access via lean queries)
// so this script is self-contained and won't break if the live models diverge.
// ---------------------------------------------------------------------------

const UserRaw = mongoose.connection
    ? mongoose.models["User"] || model("User", new Schema({}, { strict: false }))
    : model("User", new Schema({}, { strict: false }));

const CourseRaw = mongoose.connection
    ? mongoose.models["Course"] || model("Course", new Schema({}, { strict: false }))
    : model("Course", new Schema({}, { strict: false }));

const PostRaw = mongoose.connection
    ? mongoose.models["Post"] || model("Post", new Schema({}, { strict: false }))
    : model("Post", new Schema({}, { strict: false }));

const ChallengeRaw = mongoose.connection
    ? mongoose.models["Challenge"] || model("Challenge", new Schema({}, { strict: false }))
    : model("Challenge", new Schema({}, { strict: false }));

const LessonNodeRaw = mongoose.connection
    ? mongoose.models["LessonNode"] || model("LessonNode", new Schema({}, { strict: false }))
    : model("LessonNode", new Schema({}, { strict: false }));

const FileRaw = mongoose.connection
    ? mongoose.models["File"] || model("File", new Schema({}, { strict: false }))
    : model("File", new Schema({}, { strict: false }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

function logError(msg: string, err?: unknown) {
    console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, err ?? "");
}

/** Fetch a File document by its _id and return its contenthash (or null). */
async function getContentHash(fileId: unknown): Promise<string | null> {
    if (!fileId) return null;
    try {
        const file = await File.findById(fileId).lean() as any;
        return file?.contenthash ?? null;
    } catch (err) {
        logError(`Could not fetch File with id=${fileId}`, err);
        return null;
    }
}

/**
 * Replace all occurrences of /media/files/{fileId} in a string with
 * /media/files/{file.contenthash}.  Returns the updated string (or the
 * original if nothing changed / errors occur).
 */
async function replaceFileIdWithHash(text: string): Promise<{ result: string; changed: boolean }> {
    const FILE_URL_RE = /\/media\/files\/([a-f0-9]{24})/gi;
    const matches = [...new Set(Array.from(text.matchAll(FILE_URL_RE), m => m[1]))];

    if (matches.length === 0) return { result: text, changed: false };

    let updated = text;
    for (const fileId of matches) {
        const hash = await getContentHash(fileId);
        if (!hash) {
            logError(`  No contenthash found for fileId=${fileId}, skipping replacement`);
            continue;
        }
        const re = new RegExp(`/media/files/${fileId}`, "gi");
        updated = updated.replace(re, `/media/files/${hash}`);
    }

    return { result: updated, changed: updated !== text };
}

// ---------------------------------------------------------------------------
// Migration steps
// ---------------------------------------------------------------------------

/** Step 1 – User: avatarImage → avatarFileId  +  add avatarHash */
async function migrateUsers() {
    log("── Migrating Users ──────────────────────────────────────");

    const users = await User.find({
        $or: [
            { avatarImage: { $exists: true } },
            { avatarFileId: { $exists: true, $ne: null }, avatarHash: { $exists: false } },
        ],
    }).lean() as any[];

    log(`  Found ${users.length} user(s) to migrate`);
    let updated = 0;
    let skipped = 0;

    for (const user of users) {
        try {
            const $set: Record<string, unknown> = {};
            const $unset: Record<string, unknown> = {};

            // Rename avatarImage → avatarFileId
            const fileId = user.avatarImage ?? user.avatarFileId ?? null;
            if (user.avatarImage !== undefined) {
                $set["avatarFileId"] = user.avatarImage;
                $unset["avatarImage"] = "";
            }

            // Populate avatarHash from File.contenthash
            if (fileId && !user.avatarHash) {
                const hash = await getContentHash(fileId);
                if (hash) {
                    $set["avatarHash"] = hash;
                } else {
                    logError(`  User ${user._id}: could not resolve avatarHash (fileId=${fileId})`);
                }
            }

            if (Object.keys($set).length === 0 && Object.keys($unset).length === 0) {
                skipped++;
                continue;
            }

            const updateOp: Record<string, unknown> = {};
            if (Object.keys($set).length) updateOp["$set"] = $set;
            if (Object.keys($unset).length) updateOp["$unset"] = $unset;

            await UserRaw.updateOne({ _id: user._id }, updateOp);
            updated++;
            log(`  ✓ User ${user._id} updated`);
        } catch (err) {
            logError(`  User ${user._id} failed`, err);
        }
    }

    log(`  Done – updated: ${updated}, skipped: ${skipped}`);
}

/** Step 2 – Course: courseImage → courseImageFileId  +  add courseImageHash */
async function migrateCourses() {
    log("── Migrating Courses ────────────────────────────────────");

    const courses = await Course.find({
        $or: [
            { courseImage: { $exists: true } },
            { courseImageFileId: { $exists: true, $ne: null }, courseImageHash: { $exists: false } },
        ],
    }).lean() as any[];

    log(`  Found ${courses.length} course(s) to migrate`);
    let updated = 0;
    let skipped = 0;

    for (const course of courses) {
        try {
            const $set: Record<string, unknown> = {};
            const $unset: Record<string, unknown> = {};

            const fileId = course.courseImage ?? course.courseImageFileId ?? null;
            if (course.courseImage !== undefined) {
                $set["courseImageFileId"] = course.courseImage;
                $unset["courseImage"] = "";
            }

            if (fileId && !course.courseImageHash) {
                const hash = await getContentHash(fileId);
                if (hash) {
                    $set["courseImageHash"] = hash;
                } else {
                    logError(`  Course ${course._id}: could not resolve courseImageHash (fileId=${fileId})`);
                }
            }

            if (Object.keys($set).length === 0 && Object.keys($unset).length === 0) {
                skipped++;
                continue;
            }

            const updateOp: Record<string, unknown> = {};
            if (Object.keys($set).length) updateOp["$set"] = $set;
            if (Object.keys($unset).length) updateOp["$unset"] = $unset;

            await CourseRaw.updateOne({ _id: course._id }, updateOp);
            updated++;
            log(`  ✓ Course ${course._id} updated`);
        } catch (err) {
            logError(`  Course ${course._id} failed`, err);
        }
    }

    log(`  Done – updated: ${updated}, skipped: ${skipped}`);
}

/** Step 3 – Replace /media/files/{fileId} with /media/files/{hash} in text fields */
async function migrateTextFields() {
    log("── Migrating text fields (Post, Challenge, LessonNode) ──");

    const FILE_URL_RE = /\/media\/files\/[a-f0-9]{24}/i;

    // ── Posts ──────────────────────────────────────────────────────────────
    {
        const posts = await Post.find({ message: FILE_URL_RE }).lean() as any[];
        log(`  Posts with file URLs: ${posts.length}`);
        let updated = 0;
        for (const post of posts) {
            try {
                const { result, changed } = await replaceFileIdWithHash(post.message ?? "");
                if (changed) {
                    await Post.updateOne({ _id: post._id }, { $set: { message: result } });
                    updated++;
                    log(`  ✓ Post ${post._id} updated`);
                }
            } catch (err) {
                logError(`  Post ${post._id} failed`, err);
            }
        }
        log(`  Posts done – updated: ${updated}`);
    }

    // ── Challenges ─────────────────────────────────────────────────────────
    {
        const challenges = await Challenge.find({ description: FILE_URL_RE }).lean() as any[];
        log(`  Challenges with file URLs: ${challenges.length}`);
        let updated = 0;
        for (const challenge of challenges) {
            try {
                const { result, changed } = await replaceFileIdWithHash(challenge.description ?? "");
                if (changed) {
                    await Challenge.updateOne({ _id: challenge._id }, { $set: { description: result } });
                    updated++;
                    log(`  ✓ Challenge ${challenge._id} updated`);
                }
            } catch (err) {
                logError(`  Challenge ${challenge._id} failed`, err);
            }
        }
        log(`  Challenges done – updated: ${updated}`);
    }

    // ── LessonNodes ────────────────────────────────────────────────────────
    {
        const lessonNodes = await LessonNode.find({ text: FILE_URL_RE }).lean() as any[];
        log(`  LessonNodes with file URLs: ${lessonNodes.length}`);
        let updated = 0;
        for (const node of lessonNodes) {
            try {
                const { result, changed } = await replaceFileIdWithHash(node.text ?? "");
                if (changed) {
                    await LessonNode.updateOne({ _id: node._id }, { $set: { text: result } });
                    updated++;
                    log(`  ✓ LessonNode ${node._id} updated`);
                }
            } catch (err) {
                logError(`  LessonNode ${node._id} failed`, err);
            }
        }
        log(`  LessonNodes done – updated: ${updated}`);
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
    await connectDB();
    log("=== Starting migration: file-id-hash ===");

    await migrateUsers();
    await migrateCourses();
    await migrateTextFields();

    log("=== Migration complete ===");
    process.exit(0);
}

main().catch(err => {
    logError("Unhandled error in migration", err);
    process.exit(1);
});