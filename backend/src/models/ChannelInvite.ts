import { prop, getModelForClass, modelOptions, post } from "@typegoose/typegoose";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "channelinvites", timestamps: true } })
export class ChannelInvite {
    @prop({ ref: "User", required: true })
    invitedUser!: Types.ObjectId;

    @prop({ ref: "Channel", required: true })
    channel!: Types.ObjectId;

    @prop({ ref: "User", required: true })
    author!: Types.ObjectId;

    createdAt!: Date;
}

const ChannelInviteModel = getModelForClass(ChannelInvite);
export default ChannelInviteModel;