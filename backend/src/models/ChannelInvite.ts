import mongoose, { Document, InferSchemaType, Model, Schema, SchemaTypes } from "mongoose";
import ChannelParticipant from "./ChannelParticipant";

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

channelInviteSchema.methods.accept = async function(accepted: boolean = true) {
    if(accepted) {
        await ChannelParticipant.create({ channel: this.channel, user: this.invitedUser });
    }
    await ChannelInvite.deleteMany({ channel: this.channel, invitedUser: this.invitedUser });
}

declare interface IChannelInvite extends InferSchemaType<typeof channelInviteSchema>, Document {
    accept(accepted?: boolean): Promise<void>;
}

interface ChannelInviteModel extends Model<IChannelInvite> {}

const ChannelInvite = mongoose.model<IChannelInvite, ChannelInviteModel>("ChannelInvite", channelInviteSchema);

export default ChannelInvite;
