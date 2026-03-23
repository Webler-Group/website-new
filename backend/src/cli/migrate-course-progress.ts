import connectDB from "../config/dbConn";
import CourseLessonModel from "../models/CourseLesson";
import LessonNodeModel from "../models/LessonNode";
import CourseProgressModel from "../models/CourseProgress";
import { Types } from "mongoose";

interface ProgressDoc {
    _id: Types.ObjectId;
    course: Types.ObjectId;
    lastLessonNodeId: Types.ObjectId | null;
    lastLessonIndex?: number;
    lastNodeIndex?: number;
    completed: boolean;
}

async function migrate() {
    await connectDB();
    console.log("Starting course progress migration...");

    const progresses = await CourseProgressModel.find({}).lean<ProgressDoc[]>();
    console.log(`Found ${progresses.length} course progress records`);

    let updated = 0;
    let skipped = 0;

    for (const progress of progresses) {
        if (!progress.lastLessonNodeId) {
            skipped++;
            continue;
        }

        const lessonNode = await LessonNodeModel
            .findById(progress.lastLessonNodeId, { index: 1, lessonId: 1 })
            .lean();

        if (!lessonNode) {
            console.warn(`LessonNode not found for progress ${progress._id}, skipping`);
            skipped++;
            continue;
        }

        const lesson = await CourseLessonModel
            .findById(lessonNode.lessonId, { index: 1, nodes: 1 })
            .lean();

        if (!lesson) {
            console.warn(`CourseLesson not found for progress ${progress._id}, skipping`);
            skipped++;
            continue;
        }

        const lastLessonIndex = lesson.index;
        const lastNodeIndex = lessonNode.index;

        const totalLessons = await CourseLessonModel.countDocuments({ course: progress.course });
        const completed = lastNodeIndex === lesson.nodes && lastLessonIndex === totalLessons;

        await CourseProgressModel.updateOne(
            { _id: progress._id },
            { lastLessonIndex, lastNodeIndex, completed }
        );
        updated++;
    }

    console.log(`Migration complete — updated: ${updated}, skipped: ${skipped}`);
    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
