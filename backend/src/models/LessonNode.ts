import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
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
}

export const LESSON_NODE_MINIMAL_FIELDS = { _type: 1, index: 1, mode: 1 } as const;
export type LessonNodeMinimal = Pick<LessonNode, keyof typeof LESSON_NODE_MINIMAL_FIELDS>;

const LessonNodeModel = getModelForClass(LessonNode);
export default LessonNodeModel;