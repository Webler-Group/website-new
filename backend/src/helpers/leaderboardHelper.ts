import { PipelineStage, Types } from "mongoose";
import UserModel, { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import XpLogModel from "../models/XpLog";
import { toXpDay } from "./xpHelper";
import { formatUserMinimal } from "./userHelper";

export const LEADERBOARD_PERIODS = ["overall", "monthly", "daily"] as const;
export type LeaderboardPeriod = typeof LEADERBOARD_PERIODS[number];

export interface LeaderboardEntry {
    /** Standard competition rank (equal XP -> equal rank), null when the user has no XP in the period */
    rank: number | null;
    /** XP gained in the period (total XP for "overall") */
    xp: number;
    user: ReturnType<typeof formatUserMinimal>;
}

/**
 * First UTC day (YYYY-MM-DD) of a periodic leaderboard, null for the overall one.
 * Uses the same UTC calendar as XpLog.day, so "daily" = today (UTC) and "monthly" = current UTC month.
 */
const getPeriodStartDay = (period: LeaderboardPeriod, now = new Date()): string | null => {
    const today = toXpDay(now);
    switch (period) {
        case "daily": return today;
        case "monthly": return today.slice(0, 7) + "-01";
        default: return null;
    }
};

/** XP gained per user since startDay; documents { _id: userId, xp } */
const periodXpStages = (startDay: string): PipelineStage[] => [
    { $match: { day: { $gte: startDay } } },
    { $group: { _id: "$user", xp: { $sum: "$amount" } } },
    { $match: { xp: { $gt: 0 } } }
];

/** Joins the user (minimal fields) and drops inactive users */
const activeUserLookupStages = (): PipelineStage[] => [
    {
        $lookup: {
            from: UserModel.collection.name,
            localField: "_id",
            foreignField: "_id",
            pipeline: [{ $project: USER_MINIMAL_FIELDS }],
            as: "user"
        }
    },
    { $unwind: "$user" },
    { $match: { "user.active": true } }
];

/** Number of ranked (active) users with more XP than `xp` in the period */
const countUsersAbove = async (period: LeaderboardPeriod, xp: number): Promise<number> => {
    const startDay = getPeriodStartDay(period);
    if (startDay === null) {
        return UserModel.countDocuments({ active: true, xp: { $gt: xp } });
    }
    const [result] = await XpLogModel.aggregate<{ count: number }>([
        ...periodXpStages(startDay),
        { $match: { xp: { $gt: xp } } },
        ...activeUserLookupStages(),
        { $count: "count" }
    ]);
    return result?.count ?? 0;
};

/**
 * One page of the leaderboard, ordered by XP gained in the period (ties by user id for stable paging).
 * Only active users with positive XP in the period are ranked.
 */
export const getLeaderboardPage = async (period: LeaderboardPeriod, page: number, count: number): Promise<LeaderboardEntry[]> => {
    const skip = (page - 1) * count;
    const startDay = getPeriodStartDay(period);

    let rows: { xp: number; user: UserMinimal }[];
    if (startDay === null) {
        const users = await UserModel.find({ active: true, xp: { $gt: 0 } })
            .sort({ xp: -1, _id: 1 })
            .skip(skip)
            .limit(count)
            .select({ ...USER_MINIMAL_FIELDS, xp: 1 })
            .lean<(UserMinimal & { xp: number })[]>();
        rows = users.map(user => ({ xp: user.xp, user }));
    } else {
        rows = await XpLogModel.aggregate<{ xp: number; user: UserMinimal }>([
            ...periodXpStages(startDay),
            ...activeUserLookupStages(),
            { $sort: { xp: -1, _id: 1 } },
            { $skip: skip },
            { $limit: count }
        ]);
    }

    if (rows.length === 0) return [];

    // Rank of the first row comes from the database (it may tie with rows of the previous page),
    // the rest follows from the order: equal XP keeps the rank, otherwise rank = position.
    const entries: LeaderboardEntry[] = [];
    let rank = 1 + await countUsersAbove(period, rows[0].xp);
    rows.forEach((row, i) => {
        if (i > 0 && row.xp !== rows[i - 1].xp) rank = skip + i + 1;
        entries.push({ rank, xp: row.xp, user: formatUserMinimal(row.user) });
    });
    return entries;
};

/** Leaderboard entry of a single user, null when the user does not exist */
export const getLeaderboardEntry = async (period: LeaderboardPeriod, userId: Types.ObjectId | string): Promise<LeaderboardEntry | null> => {
    const user = await UserModel.findById(userId)
        .select({ ...USER_MINIMAL_FIELDS, xp: 1 })
        .lean<UserMinimal & { xp: number }>();
    if (!user) return null;

    const startDay = getPeriodStartDay(period);
    let xp = user.xp ?? 0;
    if (startDay !== null) {
        const [result] = await XpLogModel.aggregate<{ xp: number }>([
            { $match: { user: user._id, day: { $gte: startDay } } },
            { $group: { _id: null, xp: { $sum: "$amount" } } }
        ]);
        xp = result?.xp ?? 0;
    }

    const rank = user.active && xp > 0 ? 1 + await countUsersAbove(period, xp) : null;
    return { rank, xp, user: formatUserMinimal(user) };
};
