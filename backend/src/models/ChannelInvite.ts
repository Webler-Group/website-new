import { prop, getModelForClass, modelOptions, post } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { getIO, uidRoom } from "../config/socketServer";
import ChannelTypeEnum from "../data/ChannelTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { formatUserMinimal } from "../helpers/userHelper";
import { USER_MINIMAL_FIELDS, UserMinimal } from "./User";

@post<ChannelInvite>("save", async function (doc) {
    const io = getIO();
    if (!io) return;

    const { default: User } = await import("./User");
    const { default: ChannelModel } = await import("./Channel");
    const { default: Notification } = await import("./Notification");

    const author = await User.findById(doc.author, USER_MINIMAL_FIELDS).lean<UserMinimal & { _id: Types.ObjectId }>();
    const channel = await ChannelModel.findById(doc.channel, "title _type");
    if (!author || !channel) return;

    await Notification.sendToUsers([doc.invitedUser], {
        title: "New invite",
        message: `${author.name} invited you to ${channel._type == ChannelTypeEnum.DM ? "DM" : "group"}`,
        type: NotificationTypeEnum.CHANNELS,
        actionUser: author._id,
        url: "/Channels"
    }, true);

    io.to(uidRoom(doc.invitedUser.toString())).emit("channels:new_invite", {
        id: doc._id,
        author: formatUserMinimal(author),
        channelId: channel._id,
        channelType: channel._type,
        channelTitle: channel.title,
        createdAt: doc.createdAt
    });
})
@modelOptions({ schemaOptions: { collection: "channelinvites", timestamps: true } })
export class ChannelInvite {
    @prop({ ref: "User", required: true })
    invitedUser!: Types.ObjectId;

    @prop({ ref: "Channel", required: true })
    channel!: Types.ObjectId;

    @prop({ ref: "User", required: true })
    author!: Types.ObjectId;

    // Timestamps (populated by mongoose)
    createdAt!: Date;
    updatedAt!: Date;
}

export type ChannelInviteDocument = ChannelInvite & { _id: Types.ObjectId };

const ChannelInviteModel = getModelForClass(ChannelInvite);
export default ChannelInviteModel;