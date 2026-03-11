import connectDB from "../config/dbConn";
import CourseModel from "../models/Course";
import CourseProgressModel from "../models/CourseProgress";
import mongoose, { Types } from "mongoose";

async function migrate() {
    await connectDB();
    console.log("Starting participants migration...");

    const counts = await CourseProgressModel.aggregate<{
        _id: Types.ObjectId;
        count: number;
    }>([
        { $group: { _id: "$course", count: { $sum: 1 } } },
    ]);

    console.log(`Found ${counts.length} courses with progress entries`);

    if (counts.length > 0) {
        const bulkOps = counts.map(({ _id, count }) => ({
            updateOne: {
                filter: { _id },
                update: { $set: { participants: count } },
            },
        }));

        const result = await CourseModel.bulkWrite(bulkOps);
        console.log(`Updated ${result.modifiedCount} courses with participant counts`);
    }

    const coursesWithProgress = counts.map(({ _id }) => _id);
    const zeroResult = await CourseModel.updateMany(
        { _id: { $nin: coursesWithProgress } },
        { $set: { participants: 0 } }
    );
    console.log(`Zeroed out ${zeroResult.modifiedCount} courses with no participants`);

    await mongoose.disconnect();
    console.log("Migration complete");
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});