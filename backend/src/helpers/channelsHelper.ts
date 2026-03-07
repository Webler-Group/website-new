import mongoose, { Types } from "mongoose";
import ChannelParticipant from "../models/ChannelParticipant";
import ChannelInviteModel from "../models/ChannelInvite";
import ChannelMessage from "../models/ChannelMessage";
import ChannelModel from "../models/Channel";
import ChannelMessageTypeEnum from "../data/ChannelMessageTypeEnum";

export const deleteChannel = async (channelId: Types.ObjectId, session?: mongoose.ClientSession) => {
    await ChannelParticipant.deleteMany({ channel: channelId }, { session });
    await ChannelInviteModel.deleteMany({ channel: channelId }), { session };
    await ChannelMessage.deleteMany({ channel: channelId }, { session });
    await ChannelModel.deleteOne({ _id: channelId }, { session });
}

export const joinChannel = async (channelId: Types.ObjectId, userId: Types.ObjectId, session?: mongoose.ClientSession) => {
    const exists = await ChannelParticipant.exists({ channel: channelId, user: userId }).session(session ?? null);
    if (exists == null) {
        const newParticipant = new ChannelParticipant({ channel: channelId, user: userId });
        await newParticipant.save({ session });

        const joinMessage = new ChannelMessage({
            _type: ChannelMessageTypeEnum.USER_JOINED,
            content: "{action_user} joined",
            channel: channelId,
            user: userId
        });
        await joinMessage.save({ session });
    }
}

export const inviteToChannel = async () => {

}

export const processChannelInvite = async (channelId: Types.ObjectId, userId: Types.ObjectId, accepted: boolean, session?: mongoose.ClientSession) => {
    if (accepted) {
        await joinChannel(channelId, userId, session);
    }
    await ChannelInviteModel.deleteMany({ channel: channelId, invitedUser: userId }, { session });
}