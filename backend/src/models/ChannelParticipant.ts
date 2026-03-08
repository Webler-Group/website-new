import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";
import { Types } from "mongoose";
import ChannelRolesEnum from "../data/ChannelRolesEnum";

@modelOptions({ schemaOptions: { collection: "channelparticipants" } })
@index({ user: 1, channel: 1 }, { unique: true })
export class ChannelParticipant {
    @prop({ default: ChannelRolesEnum.MEMBER, enum: ChannelRolesEnum })
    role!: ChannelRolesEnum;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ ref: "Channel", required: true })
    channel!: Types.ObjectId;

    @prop({ type: Date, default: null })
    lastActiveAt!: Date | null;

    @prop({ default: false })
    muted!: boolean;

    @prop({ default: 0 })
    unreadCount!: number;
}

const ChannelParticipantModel = getModelForClass(ChannelParticipant);
export default ChannelParticipantModel;