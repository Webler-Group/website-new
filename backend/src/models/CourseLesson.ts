import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";

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
}

const CourseLessonModel = getModelForClass(CourseLesson);
export default CourseLessonModel;