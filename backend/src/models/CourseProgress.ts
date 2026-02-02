import mongoose, { InferSchemaType, Model, Schema, Types, Document } from "mongoose";
import LessonNode from "./LessonNode";
import CourseLesson from "./CourseLesson";

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
    nodesSolved: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

courseProgressSchema.pre("save", async function (next) {
    if (this.isModified("nodesSolved")) {
        const lessonIds = (await CourseLesson.find({ course: this.course }, "_id")).map(x => x._id);
        const courseNodes = await LessonNode.count({ lessonId: { $in: lessonIds } });

        if (courseNodes === this.nodesSolved) {
            this.completed = true;
        }
    }
    return next();
});

interface ICourseProgress extends InferSchemaType<typeof courseProgressSchema> {
    getLastUnlockedLessonIndex(): Promise<number>;
    getLessonNodeInfo(lessonNodeId: string): Promise<{ unlocked: boolean; isLastUnlocked: boolean; }>;
}

interface CourseProgressModel extends Model<ICourseProgress> { }

courseProgressSchema.methods.getLastUnlockedLessonIndex = async function () {
    let lastUnlockedLessonIndex = 1;
    if (this.lastLessonNodeId) {
        const lastCompletedLessonNode = await LessonNode.findById(this.lastLessonNodeId)
            .select("index")
            .populate<{ lessonId: { nodes: number, index: number } }>("lessonId", "nodes index");
        if (lastCompletedLessonNode) {
            lastUnlockedLessonIndex = lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index ?
                lastCompletedLessonNode.lessonId.index + 1 :
                lastCompletedLessonNode.lessonId.index;
        }
    }
    return lastUnlockedLessonIndex;
}

courseProgressSchema.methods.getLessonNodeInfo = async function (lessonNodeId: string) {
    const lessonNode = await LessonNode.findById(lessonNodeId)
        .select("index")
        .populate<{ lessonId: { nodes: number, index: number } }>("lessonId", "nodes index");

    const result = {
        unlocked: false,
        isLastUnlocked: false
    };

    if (!lessonNode) return result;

    const lessonIndex = lessonNode.lessonId.index;

    let lastCompletedLessonNode = null;
    if (this.lastLessonNodeId) {
        lastCompletedLessonNode = await LessonNode.findById(this.lastLessonNodeId)
            .select("index")
            .populate<{ lessonId: { nodes: number, index: number } }>("lessonId", "nodes index");
    }
    if (lastCompletedLessonNode) {
        const lastUnlockedLessonIndex = lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index ?
            lastCompletedLessonNode.lessonId.index + 1 :
            lastCompletedLessonNode.lessonId.index;

        if (lessonIndex < lastUnlockedLessonIndex) {
            result.unlocked = true;
        } else if (lessonIndex == lastUnlockedLessonIndex) {
            if (lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index) {
                result.unlocked = lessonNode.index == 1;
                result.isLastUnlocked = result.unlocked;
            } else {
                result.unlocked = lessonNode.index <= lastCompletedLessonNode.index + 1;
                result.isLastUnlocked = lessonNode.index == lastCompletedLessonNode.index + 1;
            }
        }

    } else {
        result.unlocked = lessonNode.index == 1 && lessonIndex == 1;
        result.isLastUnlocked = result.unlocked;
    }

    return result;
};

const CourseProgress = mongoose.model<ICourseProgress, CourseProgressModel>(
    "CourseProgress",
    courseProgressSchema
);

export type ICourseProgressDocument = ICourseProgress & Document;

export default CourseProgress;