import mongoose, { Types } from "mongoose";
import ChallengeModel, { Challenge } from "../models/Challenge";
import ChallengeSubmissionModel from "../models/ChallengeSubmission";
import CodeModel from "../models/Code";
import ChallengeCollectionModel from "../models/ChallengeCollection";

/**
 * Deletes challenges with their submissions, saved codes and collection entries.
 * XP log records are intentionally kept: users don't lose XP they earned (see XpLog.challenge).
 */
export const deleteChallengesAndCleanup = async (filter: mongoose.QueryFilter<Challenge>, session?: mongoose.ClientSession) => {
    const challengesToDelete = await ChallengeModel.find(filter, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>().session(session ?? null);
    const challengeIds = challengesToDelete.map(x => x._id);

    await ChallengeSubmissionModel.deleteMany({ challenge: { $in: challengeIds } }, { session });
    await CodeModel.deleteMany({ challenge: { $in: challengeIds } }, { session });
    await ChallengeCollectionModel.updateMany(
        { "sections.challenges": { $in: challengeIds } },
        { $pull: { "sections.$[].challenges": { $in: challengeIds } } },
        { session }
    );
    await ChallengeModel.deleteMany(filter, { session });
}