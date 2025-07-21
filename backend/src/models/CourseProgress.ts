import mongoose, { InferSchemaType, Model, Schema, Types, Document } from "mongoose";
import LessonNode from "./LessonNode";

const courseProgressSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
        type: Types.ObjectId,
        ref: "Course",
        required: true
    },
    lastLessonNodeId: {
        type: Types.ObjectId,
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

interface ICourseProgress extends InferSchemaType<typeof courseProgressSchema>, Document {
    getLastUnlockedLessonIndex(): Promise<number>;
    getLessonNodeInfo(lessonNodeId: string): Promise<{ unlocked: boolean; isLast: boolean; }>;
}

interface CourseProgressModel extends Model<ICourseProgress> { }

courseProgressSchema.methods.getLastUnlockedLessonIndex = async function () {
    let lastUnlockedLessonIndex = 1;
    if (this.lastLessonNodeId) {
        const lastCompletedLessonNode = await LessonNode.findById(this.lastLessonNodeId)
            .select("index")
            .populate("lessonId", "nodes index") as any;
        lastUnlockedLessonIndex = lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index ?
            lastCompletedLessonNode.lessonId.index + 1 :
            lastCompletedLessonNode.lessonId.index;
    }
    return lastUnlockedLessonIndex;
}

courseProgressSchema.methods.getLessonNodeInfo = async function (lessonNodeId: string) {
    const lessonNode = await LessonNode.findById(lessonNodeId)
        .select("index")
        .populate("lessonId", "nodes index") as any;
    const lessonIndex = lessonNode.lessonId.index;

    let unlocked = false;
    let isLast = false;

    if (this.lastLessonNodeId) {
        const lastCompletedLessonNode = await LessonNode.findById(this.lastLessonNodeId)
            .select("index")
            .populate("lessonId", "nodes index") as any;
        const lastUnlockedLessonIndex = lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index ?
            lastCompletedLessonNode.lessonId.index + 1 :
            lastCompletedLessonNode.lessonId.index;

        if (lessonIndex < lastUnlockedLessonIndex) {
            unlocked = true;
        } else if (lessonIndex == lastUnlockedLessonIndex) {
            if (lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index) {
                unlocked = lessonNode.index == 1;
                isLast = unlocked;
            } else {
                unlocked = lessonNode.index <= lastCompletedLessonNode.index + 1;
                isLast = lessonNode.index == lastCompletedLessonNode.index + 1;
            }
        }

    } else {
        unlocked = lessonNode.index == 1 && lessonIndex == 1;
        isLast = unlocked;
    }

    return {
        unlocked,
        isLast
    };
};

const CourseProgress = mongoose.model<ICourseProgress, CourseProgressModel>(
    "CourseProgress",
    courseProgressSchema
);

export default CourseProgress;