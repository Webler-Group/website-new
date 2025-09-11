import mongoose, { Document, InferSchemaType, Model, Schema, SchemaTypes, Types } from "mongoose";
import ChannelParticipant from "./ChannelParticipant";
import { getIO, uidRoom } from "../config/socketServer";
import User from "./User";
import Channel from "./Channel";
import Notification from "./Notification";
import ChannelTypeEnum from "../data/ChannelTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import ChannelMessage from "./ChannelMessage";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";

const channelInviteSchema = new Schema({
    invitedUser: {
        type: SchemaTypes.ObjectId,
        ref: "User",
        required: true
    },
    channel: {
        type: SchemaTypes.ObjectId,
        ref: "Channel",
        required: true
    },
    author: {
        type: SchemaTypes.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

channelInviteSchema.post("save", async function () {
    const io = getIO();
    if (io) {
        const author = await User.findById(this.author, "name avatarImage level roles").lean();
        const channel = await Channel.findById(this.channel, "title _type title");
        if (!author || !channel) return;

        await Notification.sendToUsers([this.invitedUser as Types.ObjectId], {
            title: "New invite",
            message: `${author.name} invited you to ${channel._type == ChannelTypeEnum.DM ? "DM" : "group"}`,
            type: NotificationTypeEnum.CHANNELS,
            actionUser: author._id,
            url: "/Channels"
        }, true);

        io.to(uidRoom(this.invitedUser.toString())).emit("channels:new_invite", {
            id: this._id,
            authorId: author._id,
            authorName: author.name,
            authorAvatar: author.avatarImage,
            channelId: channel._id,
            channelType: channel._type,
            channelTitle: channel.title,
            createdAt: this.createdAt
        });
    }
});

channelInviteSchema.methods.accept = async function (accepted: boolean = true) {
    if (accepted) {
        await ChannelParticipant.create({ channel: this.channel, user: this.invitedUser });
        await ChannelMessage.create({
            _type: ChannelMessageTypeEnum.USER_JOINED,
            content: "{action_user} joined",
            channel: this.channel,
            user: this.invitedUser
        });
    }
    await ChannelInvite.deleteMany({ channel: this.channel, invitedUser: this.invitedUser });
}

declare interface IChannelInvite extends InferSchemaType<typeof channelInviteSchema>, Document {
    accept(accepted?: boolean): Promise<void>;
}

interface ChannelInviteModel extends Model<IChannelInvite> { }

const ChannelInvite = mongoose.model<IChannelInvite, ChannelInviteModel>("ChannelInvite", channelInviteSchema);

export default ChannelInvite;
