import mongoose, { InferSchemaType, Model, Schema, SchemaTypes } from "mongoose";
import ChannelParticipant from "./ChannelParticipant";
import ChannelInvite from "./ChannelInvite";
import ChannelMessage from "./ChannelMessage";

const channelSchema = new Schema({
    /*
    1 - Direct Messages
    2 - Group
    */
    _type: {
        type: Number,
        required: true
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

declare interface IChannel extends InferSchemaType<typeof channelSchema> {}

interface ChannelModel extends Model<IChannel> {
    deleteAndCleanup(channelId: mongoose.Types.ObjectId): Promise<void>;
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

const Channel = mongoose.model<IChannel, ChannelModel>("Channel", channelSchema);

export default Channel;
