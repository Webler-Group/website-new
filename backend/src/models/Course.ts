import mongoose, { Document, InferSchemaType, Model } from "mongoose";
import CourseLesson from "./CourseLesson";
import CourseProgress from "./CourseProgress";

const courseSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
        maxLength: 64,
        minLength: 1,
        validate: [(val: string) => val.match(new RegExp("^([a-z]+-)*[a-z]+$", "i")) !== null, 'Course code can only contain words separated by "-"']
    },
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    coverImage: {
        type: String,
        required: false
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
    await CourseLesson.deleteAndCleanup({ course: courseId });
    await CourseProgress.deleteMany({ course: courseId });
    await Course.deleteOne({ _id: courseId });
}

interface ICourse extends InferSchemaType<typeof courseSchema> { }

interface CourseModel extends Model<ICourse> {
    deleteAndCleanup(id: mongoose.Types.ObjectId | string): Promise<any>;
}

const Course = mongoose.model<ICourse, CourseModel>("Course", courseSchema);

export type ICourseDocument = ICourse & Document;

export default Course;