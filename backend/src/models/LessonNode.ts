import mongoose, { InferSchemaType, Model } from "mongoose";
import QuizAnswer from "./QuizAnswer";
import CourseLesson from "./CourseLesson";

const lessonNodeSchema = new mongoose.Schema({
    /*
    * 1 - text
    * 2 - singlechoice question
    * 3 - multichoice question
    * 4 - text question
    */
    _type: {
        type: Number,
        default: 1
    },
    index: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        required: false,
        trim: true,
        minLength: 0,
        maxLength: 1000
    },
    lessonId: {
        type: mongoose.Types.ObjectId,
        ref: "CourseLesson",
        required: true
    },
    correctAnswer: {
        type: String,
        required: false
    }
});

lessonNodeSchema.statics.deleteAndCleanup = async function(filter: mongoose.FilterQuery<ILessonNode>) {
    const lessonNodesToDelete = await LessonNode.find(filter).select("_id");
    for(let i = 0; i < lessonNodesToDelete.length; ++i) {
        const lessonNode = lessonNodesToDelete[i];
        const lesson = await CourseLesson.findById(lessonNode.lessonId);
        if(lesson) {
            lesson.$inc("nodes", -1);
            await lesson.save();
        }
        await QuizAnswer.deleteMany({ courseLessonNodeId: lessonNode._id });
    }
    await LessonNode.deleteMany(filter);
}

declare interface ILessonNode extends InferSchemaType<typeof lessonNodeSchema> {}

interface LessonNodeModel extends Model<ILessonNode> {
    deleteAndCleanup(filter: mongoose.FilterQuery<ILessonNode>): Promise<any>
}

const LessonNode = mongoose.model<ILessonNode, LessonNodeModel>("LessonNode", lessonNodeSchema);

export default LessonNode;