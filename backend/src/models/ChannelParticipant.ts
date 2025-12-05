import mongoose, { InferSchemaType, Schema, SchemaTypes } from "mongoose";
import ChannelRolesEnum from "../data/ChannelRolesEnum";

const channelParticipantSchema = new Schema({
    role: {
        type: String,
        default: ChannelRolesEnum.MEMBER,
        enum: Object.values(ChannelRolesEnum)
    },
    user: {
        type: SchemaTypes.ObjectId,
        ref: "User",
        required: true
    },
    channel: {
        type: SchemaTypes.ObjectId,
        ref: "Channel",
        required: true
    },
    lastActiveAt: {
        type: Date,
        default: null
    },
    muted: {
        type: Boolean,
        default: false
    },
    unreadCount: {
        type: Number,
        default: 0
    }
});

declare interface IChannelParticipant extends InferSchemaType<typeof channelParticipantSchema> {}

const ChannelParticipant = mongoose.model<IChannelParticipant>("ChannelParticipant", channelParticipantSchema);

export default ChannelParticipant;