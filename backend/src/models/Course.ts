import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "courses" } })
export class Course {
    @prop({
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
        maxlength: 64,
        minlength: 1,
        validate: [
            (val: string) => val.match(new RegExp("^([a-z0-9]+-)*[a-z0-9]+$", "i")) !== null,
            'Course code can only contain words/numbers separated by "-"'
        ]
    })
    code!: string;

    @prop({ required: true, trim: true, minlength: 1, maxlength: 120 })
    title!: string;

    @prop({ ref: "File" })
    coverImageFileId?: Types.ObjectId;

    @prop()
    coverImageHash?: string;

    @prop({ required: true, trim: true, minlength: 1, maxlength: 1000 })
    description!: string;

    @prop({ default: false })
    visible!: boolean;
}

const CourseModel = getModelForClass(Course);
export default CourseModel;