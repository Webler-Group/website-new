import mongoose, { Types } from "mongoose";
import ChallengeModel, { Challenge } from "../models/Challenge";
import ChallengeSubmission from "../models/ChallengeSubmission";
import Code from "../models/Code";

export const deleteChallenge = async (filter: mongoose.QueryFilter<Challenge>, session?: mongoose.ClientSession) => {
    const challengesToDelete = await ChallengeModel.find(filter, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>().session(session ?? null);
    const challengeIds = challengesToDelete.map(x => x._id);

    await ChallengeSubmission.deleteMany({ challenge: { $in: challengeIds } }, { session });
    await Code.deleteMany({ challenge: { $in: challengeIds } }, { session });
    await ChallengeModel.deleteMany(filter, { session });
}