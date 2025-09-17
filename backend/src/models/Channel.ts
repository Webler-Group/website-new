import mongoose, { InferSchemaType, Model, Schema, SchemaTypes } from "mongoose";
import ChannelParticipant from "./ChannelParticipant";
import ChannelInvite from "./ChannelInvite";
import ChannelMessage from "./ChannelMessage";
import ChannelTypeEnum from "../data/ChannelTypeEnum";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";

const channelSchema = new Schema({
    _type: {
        type: Number,
        required: true,
        enum: Object.values(ChannelTypeEnum).map(Number)
    },
    title: {
        type: String,
        trim: true,
        minLength: 3,
        maxLength: 20,
        required: false
    },
    createdBy: {
        type: SchemaTypes.ObjectId,
        ref: "User",
        required: true
    },
    DMUser: {
        type: SchemaTypes.ObjectId,
        ref: "User",
        default: null
    },
    lastMessage: {
        type: SchemaTypes.ObjectId,
        ref: "ChannelMessage",
        default: null
    }
}, {
    timestamps: true
});

declare interface IChannel extends InferSchemaType<typeof channelSchema> {
}

interface ChannelModel extends Model<IChannel> {
    deleteAndCleanup(channelId: mongoose.Types.ObjectId): Promise<void>;
    join(channelId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<void>;
}

channelSchema.statics.deleteAndCleanup = async function (channelId: mongoose.Types.ObjectId) {
    // delete participants
    await ChannelParticipant.deleteMany({ channel: channelId });
    // delete invites
    await ChannelInvite.deleteMany({ channel: channelId });
    // delete messages
    await ChannelMessage.deleteMany({ channel: channelId });
    // finally delete channel itself
    await Channel.deleteOne({ _id: channelId });
};

channelSchema.statics.join = async function (channelId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
    const exists = await ChannelParticipant.exists({ channel: channelId, user: userId });
    if (exists == null) {
        await ChannelParticipant.create({ channel: channelId, user: userId });
        await ChannelMessage.create({
            _type: ChannelMessageTypeEnum.USER_JOINED,
            content: "{action_user} joined",
            channel: channelId,
            user: userId
        });
    }
}

const Channel = mongoose.model<IChannel, ChannelModel>("Channel", channelSchema);

export default Channel;
