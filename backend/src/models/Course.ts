import mongoose, { Document, InferSchemaType, Model } from "mongoose";
import CourseLesson from "./CourseLesson";
import CourseProgress from "./CourseProgress";
import File, { IFileDocument } from "./File";
import { deleteEntry, deleteSingleFile } from "../helpers/fileHelper";

const courseSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
        maxLength: 64,
        minLength: 1,
        validate: [(val: string) => val.match(new RegExp("^([a-z0-9]+-)*[a-z0-9]+$", "i")) !== null, 'Course code can only contain words/numbers separated by "-"']
    },
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    coverImageFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File"
    },
    coverImageHash: {
        type: String
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1000
    },
    visible: {
        type: Boolean,
        default: false
    }
});

courseSchema.statics.deleteAndCleanup = async function (courseId: mongoose.Types.ObjectId | string) {
    const course = await Course
        .findById(courseId)
        .populate<{ coverImageFileId: IFileDocument }>("coverImageFileId")
        .lean();

    if (!course) return;

    await CourseLesson.deleteAndCleanup({ course: courseId });
    await CourseProgress.deleteMany({ course: courseId });

    if (course.coverImageFileId) {
        await deleteSingleFile(course.coverImageFileId);
    }

    await Course.deleteOne({ _id: courseId });
}

interface ICourse extends InferSchemaType<typeof courseSchema> { }

interface CourseModel extends Model<ICourse> {
    deleteAndCleanup(id: mongoose.Types.ObjectId | string): Promise<any>;
}

const Course = mongoose.model<ICourse, CourseModel>("Course", courseSchema);

export type ICourseDocument = ICourse & Document;

export default Course;