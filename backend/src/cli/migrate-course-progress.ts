import connectDB from "../config/dbConn";
import { isCourseCompleted } from "../helpers/courseHelper";
import CourseProgressModel from "../models/CourseProgress";

async function migrate() {
    await connectDB();
    console.log("Starting course progress migration...");

    const progresses = await CourseProgressModel.find({}).lean();
    console.log(`Found ${progresses.length} course progress records`);

    let updated = 0;
    let skipped = 0;

    for (const progress of progresses) {
        if (!progress.lastLessonNodeId) {
            skipped++;
            continue;
        }

        const completed = await isCourseCompleted(progress.course, progress.lastLessonNodeId);

        if (completed !== progress.completed) {
            await CourseProgressModel.updateOne({ _id: progress._id }, { completed });
            updated++;
        } else {
            skipped++;
        }
    }

    console.log(`Migration complete — updated: ${updated}, skipped: ${skipped}`);
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});