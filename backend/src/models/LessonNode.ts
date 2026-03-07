import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { DocumentType, ModelType } from "@typegoose/typegoose/lib/types";
import { Types, mongo } from "mongoose";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../data/LessonNodeModeEnum";

@modelOptions({ schemaOptions: { collection: "lessonnodes" } })
export class LessonNode {
    @prop({
        default: LessonNodeTypeEnum.TEXT,
        enum: LessonNodeTypeEnum,
        type: Number
    })
    _type!: LessonNodeTypeEnum;

    @prop({
        default: LessonNodeModeEnum.MARKDOWN,
        enum: LessonNodeModeEnum,
        type: Number
    })
    mode!: LessonNodeModeEnum;

    @prop({ required: true })
    index!: number;

    @prop({ trim: true, maxlength: 8000 })
    text?: string;

    @prop({ ref: "CourseLesson", required: true })
    lessonId!: Types.ObjectId;

    @prop({ maxlength: 80 })
    correctAnswer?: string;

    @prop({ ref: "Code", default: null })
    codeId!: Types.ObjectId | null;

    // --- Static ---
    static async deleteAndCleanup(
        this: ModelType<LessonNode>,
        filter: Record<string, any>,
        session?: mongo.ClientSession
    ): Promise<void> {
        const { default: CourseLesson } = await import("./CourseLesson");
        const { default: QuizAnswer } = await import("./QuizAnswer");

        const lessonNodesToDelete = await LessonNodeModel.find(filter, { _id: 1, lessonId: 1 }).lean<{ _id: Types.ObjectId, lessonId: Types.ObjectId }[]>().session(session ?? null);
        for (const lessonNode of lessonNodesToDelete) {
            const lesson = await CourseLesson.findById(lessonNode.lessonId).session(session ?? null);
            if (lesson) {
                lesson.$inc("nodes", -1);
                await lesson.save({ session });
            }
            await QuizAnswer.deleteMany({ courseLessonNodeId: lessonNode._id }, { session });
        }
        await LessonNodeModel.deleteMany(filter, { session });
    }
}

const LessonNodeModel = getModelForClass(LessonNode);
export default LessonNodeModel;