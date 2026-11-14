import mongoose, { Types } from "mongoose";
import ChallengeModel, { Challenge } from "../models/Challenge";
import ChallengeSubmissionModel from "../models/ChallengeSubmission";
import CodeModel from "../models/Code";
import ChallengeCollectionModel from "../models/ChallengeCollection";
import ChallengeDifficultyEnum from "../shared/data/ChallengeDifficultyEnum";

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

type DifficultyCounts = Record<ChallengeDifficultyEnum, number>;

const toDifficultyCounts = (rows: { _id: ChallengeDifficultyEnum | null; count: number }[]): DifficultyCounts => {
    const counts: DifficultyCounts = { easy: 0, medium: 0, hard: 0 };
    for (const row of rows) {
        if (row._id) counts[row._id] = row.count;
    }
    return counts;
}

/** Solved challenges per difficulty, public challenge totals for "solved / total" and unsolved attempts */
export const getUserChallengeStats = async (userId: Types.ObjectId | string) => {
    const user = new Types.ObjectId(String(userId));

    const [solvedAgg, totalsAgg, attemptingAgg] = await Promise.all([
        ChallengeSubmissionModel.aggregate([
            { $match: { user, everPassed: true } },
            { $group: { _id: "$challenge" } },
            { $lookup: { from: "challenges", localField: "_id", foreignField: "_id", as: "challenge" } },
            { $unwind: "$challenge" },
            { $group: { _id: "$challenge.difficulty", count: { $sum: 1 } } }
        ]),
        ChallengeModel.aggregate([
            { $match: { isPublic: true } },
            { $group: { _id: "$difficulty", count: { $sum: 1 } } }
        ]),
        // Challenges the user has submitted to but not solved yet
        ChallengeSubmissionModel.aggregate([
            { $match: { user } },
            { $group: { _id: "$challenge", solved: { $max: "$passed" } } },
            { $match: { solved: false } },
            { $count: "count" }
        ])
    ]);

    return {
        solved: toDifficultyCounts(solvedAgg),
        totals: toDifficultyCounts(totalsAgg),
        attempting: (attemptingAgg[0]?.count ?? 0) as number
    };
}
