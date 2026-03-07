import { prop, getModelForClass, modelOptions, pre, DocumentType } from "@typegoose/typegoose";
import { Types } from "mongoose";

@pre<CourseProgress>("save", async function () {
    if (this.isModified("nodesSolved")) {
        const { default: CourseLesson } = await import("./CourseLesson");
        const { default: LessonNode } = await import("./LessonNode");

        const lessonIds = (await CourseLesson.find({ course: this.course }, "_id")).map(x => x._id);
        const courseNodes = await LessonNode.countDocuments({ lessonId: { $in: lessonIds } });

        if (courseNodes === this.nodesSolved) {
            this.completed = true;
        }
    }
})
@modelOptions({ schemaOptions: { collection: "courseprogresses", timestamps: true } })
export class CourseProgress {
    @prop({ ref: "User", required: true })
    userId!: Types.ObjectId;

    @prop({ ref: "Course", required: true })
    course!: Types.ObjectId;

    @prop({ ref: "LessonNode", default: null })
    lastLessonNodeId!: Types.ObjectId | null;

    @prop({ default: 0 })
    nodesSolved!: number;

    @prop({ default: false })
    completed!: boolean;

    // --- Instance methods ---
    async getLastUnlockedLessonIndex(this: DocumentType<CourseProgress>): Promise<number> {
        const { default: LessonNode } = await import("./LessonNode");

        let lastUnlockedLessonIndex = 1;
        if (this.lastLessonNodeId) {
            const lastCompletedLessonNode = await LessonNode.findById(this.lastLessonNodeId, { index: 1 })
                .populate<{ lessonId: { nodes: number; index: number } }>("lessonId", { nodes: 1, index: 1 });
            if (lastCompletedLessonNode) {
                lastUnlockedLessonIndex =
                    lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index
                        ? lastCompletedLessonNode.lessonId.index + 1
                        : lastCompletedLessonNode.lessonId.index;
            }
        }
        return lastUnlockedLessonIndex;
    }

    async getLessonNodeInfo(
        this: DocumentType<CourseProgress>,
        lessonNodeId: string | Types.ObjectId
    ): Promise<{ unlocked: boolean; isLastUnlocked: boolean }> {
        const { default: LessonNode } = await import("./LessonNode");

        const lessonNode = await LessonNode.findById(lessonNodeId, { index: 1 })
            .populate<{ lessonId: { nodes: number; index: number } }>("lessonId", { nodes: 1, index: 1 });

        const result = { unlocked: false, isLastUnlocked: false };
        if (!lessonNode) return result;

        const lessonIndex = lessonNode.lessonId.index;
        let lastCompletedLessonNode = null;

        if (this.lastLessonNodeId) {
            lastCompletedLessonNode = await LessonNode.findById(this.lastLessonNodeId, { index: 1, lessonId: 1 })
                .populate<{ lessonId: { nodes: number; index: number } }>("lessonId", { node: 1, index: 1 });
        }

        if (lastCompletedLessonNode) {
            const lastUnlockedLessonIndex =
                lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index
                    ? lastCompletedLessonNode.lessonId.index + 1
                    : lastCompletedLessonNode.lessonId.index;

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
    }
}

export default getModelForClass(CourseProgress);