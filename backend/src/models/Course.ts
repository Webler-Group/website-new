import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { DocumentType, ModelType } from "@typegoose/typegoose/lib/types";
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

    // --- Static ---
    static async deleteAndCleanup(
        this: ModelType<Course>,
        courseId: Types.ObjectId | string
    ): Promise<void> {
        const { default: CourseLesson } = await import("./CourseLesson");
        const { default: CourseProgress } = await import("./CourseProgress");
        const { deleteSingleFile } = await import("../helpers/fileHelper");

        const course = await CourseModel
            .findById(courseId)
            .populate<{ coverImageFileId: DocumentType<File> }>("coverImageFileId")
            .lean();

        if (!course) return;

        await CourseLesson.deleteAndCleanup({ course: courseId });
        await CourseProgress.deleteMany({ course: courseId });

        if (course.coverImageFileId) {
            await deleteSingleFile(course.coverImageFileId);
        }

        await CourseModel.deleteOne({ _id: courseId });
    }
}

const CourseModel = getModelForClass(Course);
export default CourseModel;