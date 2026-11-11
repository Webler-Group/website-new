import mongoose, { Types } from "mongoose";
import XpLogModel, { XpLog } from "../models/XpLog";
import UserModel from "../models/User";
import ChallengeUnlockModel from "../models/ChallengeUnlock";
import XpRewardTypeEnum from "../data/XpRewardTypeEnum";
import RolesEnum from "../data/RolesEnum";
import ChallengeDifficultyEnum from "../data/ChallengeDifficultyEnum";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import { getChallengeXp, XP_CHALLENGE_OTHER_LANGUAGE, XP_DAILY_ACTIVITY_BONUS } from "./userHelper";
import { withTransaction } from "../utils/transaction";

/** Attempts of an award transaction before giving up (conflicts only happen with parallel evaluations) */
const MAX_AWARD_ATTEMPTS = 10;
/** Base delay of the exponential backoff between attempts (ms) */
const RETRY_BASE_DELAY_MS = 10;
const RETRY_MAX_DELAY_MS = 1000;

/** Random ("full jitter") exponential backoff, so conflicting transactions don't retry in lockstep */
const backoff = (attempt: number) => new Promise(resolve =>
    setTimeout(resolve, Math.random() * Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** attempt))
);

/** UTC calendar day of a date as YYYY-MM-DD */
export const toXpDay = (date: Date): string => date.toISOString().slice(0, 10);

interface AwardChallengeXpParams {
    userId: Types.ObjectId | string;
    challengeId: Types.ObjectId | string;
    difficulty: ChallengeDifficultyEnum;
    language: CompilerLanguagesEnum;
    /** Time of the solve, defaults to now */
    date?: Date;
}

export interface AwardedXp {
    /** Total XP added to the user (0 when nothing was awarded) */
    total: number;
    rewards: Pick<XpLog, "type" | "amount">[];
}

const NOTHING_AWARDED: AwardedXp = { total: 0, rewards: [] };

/** Staff can see every solution without unlocking it, so they don't earn challenge XP */
const ROLES_WITHOUT_XP: RolesEnum[] = [RolesEnum.ADMIN, RolesEnum.CREATOR];

/** Errors after which the whole award transaction can safely run again */
const isRetryable = (err: unknown) => {
    if (!(err instanceof Error)) return false;
    const mongoErr = err as Error & { code?: number; hasErrorLabel?: (label: string) => boolean };
    return mongoErr.code === 11000 // unique index hit by a parallel award -> re-evaluate with fresh data
        || mongoErr.code === 112   // WriteConflict
        || mongoErr.hasErrorLabel?.("TransientTransactionError") === true;
};

/**
 * Rewards a passed challenge solution. Idempotent: every challenge + language combination is
 * rewarded at most once per user, so re-submitting a passed solution never adds XP again.
 *
 * - first solved language of a challenge  -> XP by difficulty (XP_CHALLENGE_FIRST_SOLVE)
 * - every further language                -> XP_CHALLENGE_OTHER_LANGUAGE
 * - first newly solved combination of the (UTC) day -> additional XP_DAILY_ACTIVITY_BONUS
 * - no XP at all when the user unlocked the official solution of the challenge
 * - no XP for admins and creators (they always see the official solutions)
 *
 * The XP log records and the user's cached total are written in one transaction; unique indexes
 * on XpLog turn races between parallel evaluations into retries instead of double rewards.
 */
export const awardChallengeXp = async (params: AwardChallengeXpParams): Promise<AwardedXp> => {
    const userId = new Types.ObjectId(params.userId.toString());
    const challengeId = new Types.ObjectId(params.challengeId.toString());
    const date = params.date ?? new Date();
    const day = toXpDay(date);

    for (let attempt = 1; ; attempt++) {
        try {
            return await withTransaction(async (session) => {
                const user = await UserModel.findById(userId).session(session);
                if (!user) throw new Error(`User ${userId} not found`);
                if (user.roles.some(role => ROLES_WITHOUT_XP.includes(role))) return NOTHING_AWARDED;

                const alreadyRewarded = await XpLogModel.exists({
                    user: userId,
                    challenge: challengeId,
                    language: params.language,
                    type: { $lte: XpRewardTypeEnum.CHALLENGE_OTHER_LANGUAGE }
                }).session(session);
                if (alreadyRewarded) return NOTHING_AWARDED;

                const hasUnlockedSolution = await ChallengeUnlockModel.exists({ challenge: challengeId, user: userId }).session(session);
                if (hasUnlockedSolution) return NOTHING_AWARDED;

                const isFirstSolve = !(await XpLogModel.exists({
                    user: userId,
                    challenge: challengeId,
                    type: XpRewardTypeEnum.CHALLENGE_FIRST_SOLVE
                }).session(session));

                const hasDailyBonus = await XpLogModel.exists({
                    user: userId,
                    day,
                    type: XpRewardTypeEnum.DAILY_ACTIVITY_BONUS
                }).session(session);

                const rewards: Pick<XpLog, "type" | "amount">[] = [
                    isFirstSolve
                        ? { type: XpRewardTypeEnum.CHALLENGE_FIRST_SOLVE, amount: getChallengeXp(params.difficulty) }
                        : { type: XpRewardTypeEnum.CHALLENGE_OTHER_LANGUAGE, amount: XP_CHALLENGE_OTHER_LANGUAGE }
                ];
                if (!hasDailyBonus) {
                    rewards.push({ type: XpRewardTypeEnum.DAILY_ACTIVITY_BONUS, amount: XP_DAILY_ACTIVITY_BONUS });
                }

                await XpLogModel.create(
                    rewards.map(reward => ({
                        user: userId,
                        challenge: challengeId,
                        language: params.language,
                        type: reward.type,
                        amount: reward.amount,
                        day,
                        createdAt: date
                    })),
                    { session, ordered: true }
                );

                const total = rewards.reduce((sum, reward) => sum + reward.amount, 0);

                user.xp += total;
                await user.save({ session }); // pre-save hook recalculates the level

                return { total, rewards };
            });
        } catch (err) {
            if (attempt >= MAX_AWARD_ATTEMPTS || !isRetryable(err)) throw err;
            await backoff(attempt);
        }
    }
};

/**
 * Recomputes a user's cached XP total (and level) from the XP log, e.g. after manual corrections.
 */
export const recalculateUserXp = async (userId: Types.ObjectId | string, session?: mongoose.ClientSession) => {
    const [result] = await XpLogModel.aggregate<{ total: number }>([
        { $match: { user: new Types.ObjectId(userId.toString()) } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]).session(session ?? null);

    const user = await UserModel.findById(userId).session(session ?? null);
    if (!user) return null;
    user.xp = result?.total ?? 0;
    await user.save({ session });
    return user.xp;
};
