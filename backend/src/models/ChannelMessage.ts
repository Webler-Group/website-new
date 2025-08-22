import mongoose, { Schema, SchemaTypes } from "mongoose";
import { getIO, uidRoom } from "../config/socketServer";
import ChannelParticipant from "./ChannelParticipant";
import User from "./User";
import Channel from "./Channel";
import PostAttachment from "./PostAttachment";

const channelMessageSchema = new Schema({
    /*
    1 - Basic
    2 - System: user joined
    3 - System: user left
    4 - System: user changed title
    */
    _type: {
        type: Number,
        required: true
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
    deleted: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

channelMessageSchema.pre("save", async function(next) {
    if (!this.isModified("content")) {
        next();
        return
    }

    await PostAttachment.updateAttachments(this.content, { channelMessage: this._id });
});

channelMessageSchema.post("save", async function() {
    await Channel.updateOne({ _id: this.channel }, { lastMessage: this._id });
    const io = getIO();
    if(io) {
        const user = await User.findById(this.user, "name avatarImage level roles").lean();
        if(!user) return;

        const attachments = await PostAttachment.getByPostId({ channelMessage: this._id });

        let channelTitle = undefined;
        const participants = await ChannelParticipant.find({ channel: this.channel }, "user muted").lean();
        const userIds = participants.map(x => x.user);
        const userIdsNotMuted = participants.filter(x => !x.muted).map(x => x.user);
        if(this._type == 3) {
            userIds.push(user._id);
        } else if(this._type == 4) {
            channelTitle = (await Channel.findById(this.channel, "title").lean())?.title;
        }

        io.to(userIds.map(x => uidRoom(x.toString()))).emit("channels:new_message", {
            type: this._type,
            channelId: this.channel.toString(),
            channelTitle,
            content: this.content,
            createdAt: this.createdAt,
            userId: user._id.toString(),
            userName: user.name,
            userAvatar: user.avatarImage,
            viewed: false,
            attachments
        });

        io.to(userIdsNotMuted.map(x => uidRoom(x.toString()))).emit("channels:new_message_info", {});
    }
});

const ChannelMessage = mongoose.model("ChannelMessage", channelMessageSchema);

export default ChannelMessage;