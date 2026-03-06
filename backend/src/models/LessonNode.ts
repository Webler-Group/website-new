import mongoose, { InferSchemaType, Model } from "mongoose";
import QuizAnswer from "./QuizAnswer";
import CourseLesson from "./CourseLesson";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../data/LessonNodeModeEnum";

const lessonNodeSchema = new mongoose.Schema({

    _type: {
        type: Number,
        default: LessonNodeTypeEnum.TEXT,
        enum: Object.values(LessonNodeTypeEnum).filter(v => typeof v === "number").map(Number)
    },
    mode: {
        type: Number,
        default: LessonNodeModeEnum.MARKDOWN,
        enum: Object.values(LessonNodeModeEnum).filter(v => typeof v === "number").map(Number)
    },
    index: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        trim: true,
        maxLength: 8000
    },
    lessonId: {
        type: mongoose.Types.ObjectId,
        ref: "CourseLesson",
        required: true
    },
    correctAnswer: {
        type: String,
        maxLength: 80
    },
    codeId: {
        type: mongoose.Types.ObjectId,
        ref: "Code",
        default: null
    }
});

lessonNodeSchema.statics.deleteAndCleanup = async function (filter: mongoose.QueryFilter<ILessonNode>, session?: mongoose.mongo.ClientSession) {
    const lessonNodesToDelete = await LessonNode.find(filter).select("_id").session(session ?? null);
    for (let i = 0; i < lessonNodesToDelete.length; ++i) {
        const lessonNode = lessonNodesToDelete[i];
        const lesson = await CourseLesson.findById(lessonNode.lessonId).session(session ?? null);
        if (lesson) {
            lesson.$inc("nodes", -1);
            await lesson.save({ session });
        }
        await QuizAnswer.deleteMany({ courseLessonNodeId: lessonNode._id }, { session });
    }
    await LessonNode.deleteMany(filter, { session });
}

declare interface ILessonNode extends InferSchemaType<typeof lessonNodeSchema> { }

interface LessonNodeModel extends Model<ILessonNode> {
    deleteAndCleanup(filter: mongoose.QueryFilter<ILessonNode>, session?: mongoose.mongo.ClientSession): Promise<any>
}

const LessonNode = mongoose.model<ILessonNode, LessonNodeModel>("LessonNode", lessonNodeSchema);

export default LessonNode;