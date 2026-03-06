import mongoose, { Document, InferSchemaType, Model } from "mongoose";
import LessonNode from "./LessonNode";
import Post from "./Post";

const courseLessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    index: {
        type: Number,
        required: true
    },
    course: {
        type: mongoose.Types.ObjectId,
        ref: "Course",
        required: true
    },
    nodes: {
        type: Number,
        default: 0
    },
    comments: {
        type: Number,
        default: 0
    }
});

courseLessonSchema.statics.deleteAndCleanup = async function (filter: mongoose.QueryFilter<ICourseLesson>, session?: mongoose.mongo.ClientSession) {
    const lessonsToDelete = await CourseLesson.find(filter).select("_id");
    for (let i = 0; i < lessonsToDelete.length; ++i) {
        const lesson = lessonsToDelete[i];
        await LessonNode.deleteAndCleanup({ lessonId: lesson._id }, session);
        await Post.deleteAndCleanup({ lessonId: lesson._id }, session);
    }

    await CourseLesson.deleteMany(filter, { session });
}

interface ICourseLesson extends InferSchemaType<typeof courseLessonSchema> { }

interface CourseLessonModel extends Model<ICourseLesson> {
    deleteAndCleanup(filter: mongoose.QueryFilter<ICourseLesson>, session?: mongoose.mongo.ClientSession): Promise<any>
}

const CourseLesson = mongoose.model<ICourseLesson, CourseLessonModel>("CourseLesson", courseLessonSchema);

export type ICourseLessonDocument = ICourseLesson & Document;

export default CourseLesson;