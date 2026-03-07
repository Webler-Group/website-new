import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import ChannelRolesEnum from "../data/ChannelRolesEnum";

@modelOptions({ schemaOptions: { collection: "channelparticipants" } })
export class ChannelParticipant {
    @prop({ default: ChannelRolesEnum.MEMBER, enum: ChannelRolesEnum })
    role!: ChannelRolesEnum;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ ref: "Channel", required: true })
    channel!: Types.ObjectId;

    @prop({ default: null })
    lastActiveAt!: Date | null;

    @prop({ default: false })
    muted!: boolean;

    @prop({ default: 0 })
    unreadCount!: number;
}

export default getModelForClass(ChannelParticipant);