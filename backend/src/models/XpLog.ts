import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";
import { Types } from "mongoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import XpRewardTypeEnum from "../data/XpRewardTypeEnum";

/**
 * One XP reward. The user's total (User.xp) is a cached sum of these records and is always
 * changed in the same transaction as the records are inserted (see xpHelper.awardChallengeXp).
 *
 * The unique indexes make double rewards impossible even when solutions are evaluated in parallel:
 * a conflicting insert fails and the transaction is retried with fresh data.
 */
// One solve reward per challenge + language (types 1 and 2; the daily bonus is type 3)
@index(
    { user: 1, challenge: 1, language: 1 },
    { unique: true, partialFilterExpression: { type: { $lte: XpRewardTypeEnum.CHALLENGE_OTHER_LANGUAGE } } }
)
// Only one "first solve" reward per challenge
@index(
    { user: 1, challenge: 1 },
    { unique: true, partialFilterExpression: { type: XpRewardTypeEnum.CHALLENGE_FIRST_SOLVE } }
)
// Only one daily activity bonus per day
@index(
    { user: 1, day: 1 },
    { unique: true, partialFilterExpression: { type: XpRewardTypeEnum.DAILY_ACTIVITY_BONUS } }
)
// User XP history, newest first
@index({ user: 1, createdAt: -1 })
@modelOptions({ schemaOptions: { collection: "xplogs", timestamps: { createdAt: true, updatedAt: false } } })
export class XpLog {
    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    /**
     * The rewarded challenge. XP is kept when a challenge is deleted, so this may reference a challenge
     * that no longer exists - populating it then yields null, code reading the log must handle that.
     */
    @prop({ ref: "Challenge", required: true })
    challenge!: Types.ObjectId;

    @prop({ required: true, enum: CompilerLanguagesEnum, type: String })
    language!: CompilerLanguagesEnum;

    @prop({ required: true, enum: XpRewardTypeEnum, type: Number })
    type!: XpRewardTypeEnum;

    @prop({ required: true, min: 0 })
    amount!: number;

    /** UTC day of the reward (YYYY-MM-DD), used for the one-bonus-per-day rule and activity stats */
    @prop({ required: true })
    day!: string;

    createdAt!: Date;
}

const XpLogModel = getModelForClass(XpLog);
export default XpLogModel;
