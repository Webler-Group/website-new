import mongoose, { InferSchemaType, Model } from "mongoose";

const courseProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    courseId: {
        type: mongoose.Types.ObjectId,
        ref: "Course",
        required: true
    },
    lastLessonNodeId: {
        type: mongoose.Types.ObjectId,
        ref: "LessonNode",
        default: null
    },
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

declare interface ICourseProgress extends InferSchemaType<typeof courseProgressSchema> {}

interface CourseProgressModel extends Model<ICourseProgress> {
}

const CourseProgress = mongoose.model<ICourseProgress, CourseProgressModel>("CourseProgress", courseProgressSchema);

export default CourseProgress;