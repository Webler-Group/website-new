import { prop, getModelForClass, modelOptions, pre, post } from "@typegoose/typegoose";
import { Types } from "mongoose";
import PostTypeEnum from "../data/PostTypeEnum";

@pre<Post>("save", function () {
    this.$locals.messageModified = this.isModified("message");
})
@post<Post>("save", async function (doc) {
    if (doc.$locals.messageModified) {
        const { updatePostAttachments } = await import("../helpers/postsHelper");
        await updatePostAttachments(doc.message, { post: doc._id });
    }
})
@modelOptions({ schemaOptions: { collection: "posts", timestamps: true } })
export class Post {
    @prop({
        required: true,
        enum: PostTypeEnum,
        type: Number
    })
    _type!: PostTypeEnum;

    @prop({ default: false })
    isAccepted!: boolean;

    @prop({ default: false })
    isPinned!: boolean;

    @prop({ ref: "Code", default: null })
    codeId!: Types.ObjectId | null;

    @prop({ ref: "Post", default: null })
    feedId!: Types.ObjectId | null;

    @prop({ ref: "CourseLesson", default: null })
    lessonId!: Types.ObjectId | null;

    @prop({ ref: "Post", default: null })
    parentId!: Types.ObjectId | null;

    @prop({ required: true, trim: true, minlength: 1, maxlength: 4096 })
    message!: string;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ default: 0 })
    votes!: number;

    @prop({ default: 0 })
    answers!: number;

    @prop({ default: 0 })
    shares!: number;

    @prop({ trim: true, minlength: 1, maxlength: 120 })
    title?: string;

    @prop({
        type: () => [Types.ObjectId],
        ref: "Tag",
        validate: [(val: Types.ObjectId[]) => val.length <= 10, "tags exceed limit of 10"]
    })
    tags!: Types.ObjectId[];

    @prop({ default: false })
    hidden!: boolean;

    createdAt!: Date;
}

const PostModel = getModelForClass(Post);
export default PostModel;