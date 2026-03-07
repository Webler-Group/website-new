import { prop, getModelForClass, modelOptions, pre, post } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { getIO, uidRoom } from "../config/socketServer";
import { getImageUrl } from "../controllers/mediaController";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";
import ChannelTypeEnum from "../data/ChannelTypeEnum";
import { USER_MINIMAL_FIELDS, UserMinimal } from "./User";
import { formatUserMinimal } from "../helpers/userHelper";

@pre<ChannelMessage>("save", async function () {
    this.wasNew = this.isNew;

    try {
        const { default: PostAttachment } = await import("./PostAttachment");
        const { default: ChannelParticipant } = await import("./ChannelParticipant");

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
            } else if (this.isModified("deleted") && this.deleted === true) {
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
    } catch (err) {
        if (err instanceof Error) {
            console.log("ChannelMessage pre(save) failed:", err.message);
        }
    }
})
@post<ChannelMessage>("save", async function (doc) {
    try {
        if (!doc.wasNew) return;

        const { default: Channel } = await import("./Channel");
        const { default: ChannelParticipant } = await import("./ChannelParticipant");
        const { default: User } = await import("./User");
        const { default: Notification } = await import("./Notification");
        const { default: PostAttachment } = await import("./PostAttachment");
        const { default: ChannelMessageModel } = await import("./ChannelMessage");
        const NotificationTypeEnum = (await import("../data/NotificationTypeEnum")).default;

        const channel = await Channel.findById(doc.channel);
        if (!channel) return;

        channel.lastMessage = doc._id;
        await channel.save();

        await ChannelParticipant.updateMany(
            {
                channel: doc.channel,
                user: { $ne: doc.user },
                $or: [
                    { lastActiveAt: null },
                    { lastActiveAt: { $lt: doc.createdAt } }
                ]
            },
            { $inc: { unreadCount: 1 } }
        );

        const user = await User.findById(doc.user, "name avatarHash level roles").lean();
        if (!user) return;

        const participants = await ChannelParticipant.find({ channel: doc.channel }, "user muted unreadCount").lean();

        await Notification.sendToUsers(
            participants
                .filter(p => p.user.toString() !== user._id.toString() && !p.muted && (!p.unreadCount || p.unreadCount <= 1))
                .map(p => p._id) as Types.ObjectId[],
            {
                title: "New message",
                type: NotificationTypeEnum.CHANNELS,
                actionUser: user._id,
                message: channel._type == ChannelTypeEnum.DM
                    ? user.name + " sent you message"
                    : "New messages in group " + channel.title,
                url: "/Channels/" + channel._id
            },
            true
        );

        const io = getIO();
        if (io) {
            const attachments = await PostAttachment.getByPostId({ channelMessage: doc._id });
            let channelTitle = "";
            const userIds = participants.map(x => x.user);
            const userIdsNotMuted = participants.filter(x => !x.muted).map(x => x.user);

            if (doc._type == ChannelMessageTypeEnum.USER_LEFT) {
                userIds.push(user._id);
            } else if (doc._type == ChannelMessageTypeEnum.TITLE_CHANGED) {
                channelTitle = channel.title!;
            }

            const reply = doc.repliedTo
                ? await ChannelMessageModel.findById(doc.repliedTo)
                    .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
                    .lean()
                : null;

            io.to(userIds.map(x => uidRoom(x.toString()))).emit("channels:new_message", {
                id: doc._id,
                type: doc._type,
                channelId: doc.channel.toString(),
                channelTitle,
                content: doc.content,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                viewed: false,
                deleted: doc.deleted,
                user: formatUserMinimal(user),
                repliedTo: reply ? {
                    id: reply._id,
                    content: reply.content,
                    createdAt: reply.createdAt,
                    updatedAt: reply.updatedAt,
                    user: formatUserMinimal(reply.user),
                    deleted: reply.deleted
                } : null,
                attachments
            });

            io.to(userIdsNotMuted.map(x => uidRoom(x.toString()))).emit("channels:new_message_info", {});
        }
    } catch (err) {
        if (err instanceof Error) {
            console.log("ChannelMessage post(save) failed:", err.message);
        }
    }
})
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

    // Timestamps
    createdAt!: Date;
    updatedAt!: Date;

    wasNew?: boolean;
}

const ChannelMessageModel = getModelForClass(ChannelMessage);
export default ChannelMessageModel;