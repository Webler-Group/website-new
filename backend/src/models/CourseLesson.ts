import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { Types, mongo } from "mongoose";

@modelOptions({ schemaOptions: { collection: "courselessons" } })
export class CourseLesson {
    @prop({ required: true, trim: true, minlength: 1, maxlength: 120 })
    title!: string;

    @prop({ required: true })
    index!: number;

    @prop({ ref: "Course", required: true })
    course!: Types.ObjectId;

    @prop({ default: 0 })
    nodes!: number;

    @prop({ default: 0 })
    comments!: number;

    // --- Static ---
    static async deleteAndCleanup(
        this: ModelType<CourseLesson>,
        filter: Record<string, any>,
        session?: mongo.ClientSession
    ): Promise<void> {
        const { default: LessonNode } = await import("./LessonNode");
        const { default: Post } = await import("./Post");

        const lessonsToDelete = await CourseLessonModel.find(filter, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>();;
        for (const lesson of lessonsToDelete) {
            await LessonNode.deleteAndCleanup({ lessonId: lesson._id }, session);
            await Post.deleteAndCleanup({ lessonId: lesson._id }, session);
        }
        await CourseLessonModel.deleteMany(filter, { session });
    }
}

const CourseLessonModel = getModelForClass(CourseLesson);
export default CourseLessonModel;