import { prop, getModelForClass, modelOptions, post, pre } from "@typegoose/typegoose";
import { Types } from "mongoose";
import NotificationTypeEnum from "../data/NotificationTypeEnum";

@modelOptions({ schemaOptions: { collection: "notifications", timestamps: true } })
export class Notification {
    @prop({
        required: true,
        enum: NotificationTypeEnum,
        type: Number
    })
    _type!: NotificationTypeEnum;

    @prop({ required: true })
    message!: string;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ ref: "User", required: true })
    actionUser!: Types.ObjectId;

    @prop({ default: false })
    isSeen!: boolean;

    @prop({ default: false })
    isClicked!: boolean;

    @prop({ ref: "Code" })
    codeId?: Types.ObjectId;

    @prop({ ref: "Post" })
    questionId?: Types.ObjectId;

    @prop({ ref: "Post" })
    postId?: Types.ObjectId;

    @prop({ ref: "Post" })
    feedId?: Types.ObjectId;

    @prop({ ref: "CourseLesson" })
    lessonId?: Types.ObjectId;

    @prop()
    courseCode?: string;

    @prop({ default: false })
    hidden!: boolean;

    createdAt!: Date;
}

const NotificationModel = getModelForClass(Notification);
export default NotificationModel;