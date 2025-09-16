import mongoose, { Schema, SchemaTypes, Types } from "mongoose";
import { getIO, uidRoom } from "../config/socketServer";
import ChannelParticipant from "./ChannelParticipant";
import User from "./User";
import Channel from "./Channel";
import PostAttachment from "./PostAttachment";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";
import ChannelTypeEnum from "../data/ChannelTypeEnum";
import Notification from "./Notification";
import NotificationTypeEnum from "../data/NotificationTypeEnum";

const channelMessageSchema = new Schema({
    _type: {
        type: Number,
        required: true,
        enum: Object.values(ChannelMessageTypeEnum).map(Number)
    },
    content: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1024
    },
    user: {
        type: SchemaTypes.ObjectId,
        ref: "User",
        required: true,
    },
    channel: {
        type: SchemaTypes.ObjectId,
        ref: "Channel",
        required: true,
    },
    repliedTo:{
        type: SchemaTypes.ObjectId,
        ref: "ChannelMessage",
        default: null,
    },
    deleted: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

channelMessageSchema.pre("save", async function (next) {
    (this as any).wasNew = this.isNew;

    try {
        if (this.isModified("content"))
            await PostAttachment.updateAttachments(this.content, { channelMessage: this._id });

        if (!this.isNew) {
            const participants = await ChannelParticipant.find({ channel: this.channel }, "user").lean();

            if (this.isModified("content")) {
                const userIds = participants.map(x => x.user);

                const io = getIO();
                if (io) {
                    const attachments = await PostAttachment.getByPostId({ channelMessage: this._id });

                    io.to(userIds.map(x => uidRoom(x.toString()))).emit("channels:message_edited", {
                        messageId: this._id.toString(),
                        channelId: this.channel.toString(),
                        content: this.content,
                        attachments,
                        updatedAt: new Date()
                    });
                }
            } else if (this.isModified("deleted") && this.deleted == true) {

                const io = getIO();
                if (io) {
                    const userIds = participants.map(x => x.user);

                    io.to(userIds.map(x => uidRoom(x.toString()))).emit("channels:message_deleted", {
                        messageId: this._id.toString(),
                        channelId: this.channel.toString()
                    });
                }
            }
        }
    } catch (err: any) {
        console.log("channelMessageSchema.pre(save) failed:", err.message);
    } finally {
        next();
    }
});

channelMessageSchema.post("save", async function () {
    try {
        if ((this as any).wasNew) {

            const channel = await Channel.findById(this.channel);
            if (!channel) return;

            channel.lastMessage = this._id;
            await channel.save();

            await ChannelParticipant.updateMany(
                {
                    channel: this.channel,
                    user: { $ne: this.user },
                    $or: [
                        { lastActiveAt: null },
                        { lastActiveAt: { $lt: this.createdAt } }
                    ]
                },
                { $inc: { unreadCount: 1 } }
            );

            const user = await User.findById(this.user, "name avatarImage level roles").lean();
            if (!user) return;

            const participants = await ChannelParticipant.find({ channel: this.channel }, "user muted unreadCount").lean();

            await Notification.sendToUsers(participants
                .filter(p => p.user.toString() !== user._id.toString() && !p.muted && (!p.unreadCount || p.unreadCount <= 1))
                .map(p => p._id) as Types.ObjectId[], {
                title: "New message",
                type: NotificationTypeEnum.CHANNELS,
                actionUser: user._id,
                message: channel._type == ChannelTypeEnum.DM ? user.name + " sent you message" : " New messages in group " + channel.title,
                url: "/Channels/" + channel._id
            }, true);

            const io = getIO();
            if (io) {
                const attachments = await PostAttachment.getByPostId({ channelMessage: this._id });

                let channelTitle = "";

                const userIds = participants.map(x => x.user);
                const userIdsNotMuted = participants.filter(x => !x.muted).map(x => x.user);

                if (this._type == ChannelMessageTypeEnum.USER_LEFT) {
                    userIds.push(user._id);
                } else if (this._type == ChannelMessageTypeEnum.TITLE_CHANGED) {
                    channelTitle = channel.title!;
                }

                io.to(userIds.map(x => uidRoom(x.toString()))).emit("channels:new_message", {
                    id: this._id,
                    type: this._type,
                    channelId: this.channel.toString(),
                    channelTitle,
                    content: this.content,
                    createdAt: this.createdAt,
                    updatedAt: this.updatedAt,
                    userId: user._id.toString(),
                    userName: user.name,
                    userAvatar: user.avatarImage,
                    viewed: false,
                    deleted: this.deleted,
                    repliedTo: this.deleted? null : this.repliedTo,
                    attachments
                });

                io.to(userIdsNotMuted.map(x => uidRoom(x.toString()))).emit("channels:new_message_info", {});
            }
        }
    } catch (err: any) {
        console.log("channelMessageSchema.post(save) failed:", err.message);
    } finally {

    }
});

const ChannelMessage = mongoose.model("ChannelMessage", channelMessageSchema);

export default ChannelMessage;