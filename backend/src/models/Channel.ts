import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import ChannelTypeEnum from "../data/ChannelTypeEnum";

@modelOptions({ schemaOptions: { collection: "channels", timestamps: true } })
export class Channel {
    @prop({
        required: true,
        enum: ChannelTypeEnum,
        type: Number
    })
    _type!: ChannelTypeEnum;

    @prop({ trim: true, minlength: 3, maxlength: 20 })
    title?: string;

    @prop({ ref: "User", required: true })
    createdBy!: Types.ObjectId;

    @prop({ ref: "User", default: null })
    DMUser!: Types.ObjectId | null;

    @prop({ ref: "ChannelMessage", default: null })
    lastMessage!: Types.ObjectId | null;

    createdAt!: Date;
    updatedAt!: Date;
}

const ChannelModel = getModelForClass(Channel);
export default ChannelModel;