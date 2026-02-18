import mongoose, { InferSchemaType, Model } from "mongoose";
import QuizAnswer from "./QuizAnswer";
import CourseLesson from "./CourseLesson";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../data/LessonNodeModeEnum";
import { maxLength } from "zod";

const lessonNodeSchema = new mongoose.Schema({

    _type: {
        type: Number,
        default: LessonNodeTypeEnum.TEXT,
        enum: Object.values(LessonNodeTypeEnum).map(Number)
    },
    mode: {
        type: Number,
        default: LessonNodeModeEnum.MARKDOWN,
        enum: Object.values(LessonNodeModeEnum).map(Number)
    },
    index: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        default: "",
        trim: true,
        minLength: 0,
        maxLength: 8000
    },
    lessonId: {
        type: mongoose.Types.ObjectId,
        ref: "CourseLesson",
        required: true
    },
    correctAnswer: {
        type: String,
        maxLength: 8000
    },
    codeId: {
        type: mongoose.Types.ObjectId,
        ref: "Code",
        default: null
    }
});

lessonNodeSchema.statics.deleteAndCleanup = async function (filter: mongoose.FilterQuery<ILessonNode>) {
    const lessonNodesToDelete = await LessonNode.find(filter).select("_id");
    for (let i = 0; i < lessonNodesToDelete.length; ++i) {
        const lessonNode = lessonNodesToDelete[i];
        const lesson = await CourseLesson.findById(lessonNode.lessonId);
        if (lesson) {
            lesson.$inc("nodes", -1);
            await lesson.save();
        }
        await QuizAnswer.deleteMany({ courseLessonNodeId: lessonNode._id });
    }
    await LessonNode.deleteMany(filter);
}

declare interface ILessonNode extends InferSchemaType<typeof lessonNodeSchema> { }

interface LessonNodeModel extends Model<ILessonNode> {
    deleteAndCleanup(filter: mongoose.FilterQuery<ILessonNode>): Promise<any>
}

const LessonNode = mongoose.model<ILessonNode, LessonNodeModel>("LessonNode", lessonNodeSchema);

export default LessonNode;