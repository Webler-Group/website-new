import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "quizanswers" } })
export class QuizAnswer {
    @prop({ required: true, trim: true, minlength: 1, maxlength: 120 })
    text!: string;

    @prop({ default: false })
    correct!: boolean;

    @prop({ ref: "LessonNode", default: null })
    courseLessonNodeId!: Types.ObjectId | null;
}

export default getModelForClass(QuizAnswer);