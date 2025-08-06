import mongoose, { Schema, SchemaTypes } from "mongoose";

const channelMessageSchema = new Schema({
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
    }
}, { timestamps: true });

const ChannelMessage = mongoose.model("ChannelMessage", channelMessageSchema);

export default ChannelMessage;