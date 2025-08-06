import mongoose, { InferSchemaType, Schema, SchemaTypes } from "mongoose";
import channelRoles from "../data/channelRoles";

const channelParticipantSchema = new Schema({
    role: {
        type: String,
        default: "Member",
        enum: channelRoles
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
    }
});

declare interface IChannelParticipant extends InferSchemaType<typeof channelParticipantSchema> {}

const ChannelParticipant = mongoose.model<IChannelParticipant>("ChannelParticipant", channelParticipantSchema);

export default ChannelParticipant;