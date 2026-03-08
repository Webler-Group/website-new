import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";

@modelOptions({ schemaOptions: { collection: "channelmessages", timestamps: true } })
export class ChannelMessage {
    @prop({
        required: true,
        enum: ChannelMessageTypeEnum,
        type: Number
    })
    _type!: ChannelMessageTypeEnum;

    @prop({ required: true, trim: true, minlength: 1, maxlength: 1024 })
    content!: string;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ ref: "Channel", required: true })
    channel!: Types.ObjectId;

    @prop({ ref: "ChannelMessage", default: null })
    repliedTo!: Types.ObjectId | null;

    @prop({ default: false })
    deleted!: boolean;

    createdAt!: Date;
    updatedAt!: Date;
}

const ChannelMessageModel = getModelForClass(ChannelMessage);
export default ChannelMessageModel;