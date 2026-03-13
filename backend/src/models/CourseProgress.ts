import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "courseprogresses", timestamps: true } })
export class CourseProgress {
    @prop({ ref: "User", required: true })
    userId!: Types.ObjectId;

    @prop({ ref: "Course", required: true })
    course!: Types.ObjectId;

    @prop({ ref: "LessonNode", default: null })
    lastLessonNodeId!: Types.ObjectId | null;

    @prop({ default: false })
    completed!: boolean;

    updatedAt!: Date;
}

const CourseProgressModel = getModelForClass(CourseProgress);
 export default CourseProgressModel;