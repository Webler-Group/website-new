import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import PostAttachmentTypeEnum from "../data/PostAttachmentTypeEnum";

@modelOptions({ schemaOptions: { collection: "postattachments" } })
export class PostAttachment {
    @prop({ ref: "Post", default: null })
    postId!: Types.ObjectId | null;

    @prop({ ref: "ChannelMessage", default: null })
    channelMessageId!: Types.ObjectId | null;

    @prop({
        required: true,
        enum: PostAttachmentTypeEnum,
        type: Number
    })
    _type!: PostAttachmentTypeEnum;

    @prop({ ref: "Code", default: null })
    code!: Types.ObjectId | null;

    @prop({ ref: "Post", default: null })
    question!: Types.ObjectId | null;

    @prop({ ref: "Post", default: null })
    feed!: Types.ObjectId | null;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;
}

const PostAttachmentModel = getModelForClass(PostAttachment);
export default PostAttachmentModel;