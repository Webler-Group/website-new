import {Request} from "express";
import mongoose, {Types} from "mongoose";
import UserModel, {User, USER_MINIMAL_FIELDS, UserAdminMinimal, UserMinimal} from "../models/User";
import IpModel from "../models/Ip";
import {getImageUrl} from "../controllers/mediaController";
import EmailChangeRecordModel from "../models/EmailChangeRecord";
import UserFollowingModel from "../models/UserFollowing";
import {deleteNotifications} from "./notificationHelper";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { BlockModel } from "../models/Block";
import RolesEnum from "../data/RolesEnum";
import ChallengeDifficultyEnum from "../data/ChallengeDifficultyEnum";

const MAX_IPS = 50;

export const getRequestIp = (req: Request) => {
    return (
        (req.headers["cf-connecting-ip"] as string) ||
        (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
        req.ip
    );
};

export const updateUserIp = async (userId: Types.ObjectId, ip: string, session?: mongoose.ClientSession) => {
    const ipDoc = await IpModel.findOneAndUpdate(
        { value: ip },
        { $setOnInsert: { value: ip } },
        { upsert: true, returnDocument: "after", session }
    );

    await UserModel.updateOne(
        { _id: userId },
        [
            {
                $set: {
                    lastIp: ipDoc._id,
                    ips: {
                        $slice: [
                            { $setUnion: [{ $ifNull: ["$ips", []] }, [ipDoc._id]] },
                            -MAX_IPS
                        ]
                    }
                }
            }
        ],
        { updatePipeline: true, session }
    );
};

export const formatUserMinimal = (user: UserMinimal, followersCount = 0) => {
    return {
        id: user._id.toString(),
        name: user.name,
        avatarUrl: getImageUrl(user.avatarHash),
        countryCode: user.countryCode,
        level: user.level,
        roles: user.roles,
        active: user.active,
        isFollowing: false,
        followersCount
    };
}

export const formatUserAdminMinimal = (user: UserAdminMinimal) => {
    return {
        id: user._id,
        email: user.email,
        countryCode: user.countryCode,
        name: user.name,
        avatarUrl: getImageUrl(user.avatarHash),
        roles: user.roles,
        registerDate: user.createdAt,
        level: user.level,
        verified: user.emailVerified,
        active: user.active,
        lastLoginDate: user.lastLoginAt
    };
};

type PopulatedIp = { _id: Types.ObjectId; value: string; banned: boolean };
type PopulatedUserAdmin = Omit<User, "ips" | "lastIp"> & {
    _id: Types.ObjectId;
    ips: PopulatedIp[];
    lastIp?: PopulatedIp;
};

export const formatUserAdmin = (user: PopulatedUserAdmin) => {
    return {
        id: user._id,
        email: user.email,
        countryCode: user.countryCode,
        name: user.name,
        avatarUrl: getImageUrl(user.avatarHash),
        roles: user.roles,
        bio: user.bio,
        registerDate: user.createdAt,
        level: user.level,
        verified: user.emailVerified,
        active: user.active,
        lastLoginDate: user.lastLoginAt,
        ban: user.ban
            ? { author: user.ban.author, note: user.ban.note, date: user.ban.date }
            : null,
        ips: (user.ips ?? []).map(ip => ({ id: ip._id.toString(), value: ip.value, banned: ip.banned })),
        lastIp: user.lastIp ? { id: user.lastIp._id.toString(), value: user.lastIp.value, banned: user.lastIp.banned } : undefined
    };
};

export const formatAuthUser = (user: User & { _id: Types.ObjectId }) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    avatarUrl: getImageUrl(user.avatarHash),
    roles: user.roles,
    emailVerified: user.emailVerified,
    countryCode: user.countryCode,
    registerDate: user.createdAt,
    level: user.level,
    xp: user.xp
});

export const generateEmailChangeRecord = async (userId: Types.ObjectId, newEmail: string) => {
    await EmailChangeRecordModel.deleteMany({ userId });
    const exists = await UserModel.exists({ email: newEmail });
    if (exists) return null;

    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    await EmailChangeRecordModel.create({ userId, newEmail, code });
    return code;
}

/* ---------------------------------------------------------------------------------------------
 * XP rewards
 *
 * Calibrated against totalXpToReachLevel (25 * (x + x^2), x = level - 1) for the initial set of
 * ~200 challenges and 12 challenge languages (assuming ~40 % easy, 40 % medium, 20 % hard):
 *   - level 2 (50 XP) after e.g. two medium challenges or a single hard one
 *   - all challenges in one language           ->  ~5 200 XP  ->  level 14
 *   - all challenges in all 12 languages       -> ~16 200 XP  ->  level 25
 *   - one year of daily activity bonus         ->  +3 650 XP
 * so dedicated users keep progressing for a long time and level 30+ stays rare.
 *
 * XP is never taken back: rewards for challenges that are deleted later stay in the XP log.
 * ------------------------------------------------------------------------------------------- */

/** XP for solving a challenge for the first time (in any language), by difficulty */
export const XP_CHALLENGE_FIRST_SOLVE: Record<ChallengeDifficultyEnum, number> = {
    [ChallengeDifficultyEnum.EASY]: 10,
    [ChallengeDifficultyEnum.MEDIUM]: 25,
    [ChallengeDifficultyEnum.HARD]: 60
};

/** XP for solving an already solved challenge in another language */
export const XP_CHALLENGE_OTHER_LANGUAGE = 5;

/** Bonus XP for the first newly solved challenge + language combination of a (UTC) day */
export const XP_DAILY_ACTIVITY_BONUS = 10;

/** XP awarded for solving a challenge for the first time; shown to users as the challenge's XP */
export const getChallengeXp = (difficulty: ChallengeDifficultyEnum): number =>
    XP_CHALLENGE_FIRST_SOLVE[difficulty] ?? XP_CHALLENGE_FIRST_SOLVE[ChallengeDifficultyEnum.EASY];

export const totalXpToReachLevel = (level: number): number => {
    const x = level - 1;
    return 25 * (x + x * x);
}

export const levelFromXp = (xp: number): number => {
    const x = Math.floor(
        (-1 + Math.sqrt(1 + (4 * xp) / 25)) / 2
    );

    return x + 1;
}

export const deleteFollowAndCleanup = async (userId: Types.ObjectId, followingId: Types.ObjectId, session?: mongoose.ClientSession) => {
    await UserFollowingModel.deleteOne({ user: userId, following: followingId }, { session });
    await deleteNotifications({
        user: followingId,
        actionUser: userId,
        _type: NotificationTypeEnum.PROFILE_FOLLOW
    }, session);
}



export const MAX_BLOCK_COUNT = 100;

export const isBlocked = async (userA: Types.ObjectId | string, userB: Types.ObjectId | string, session?: mongoose.ClientSession) => {
    const exists = await BlockModel.exists({
        $or: [
            { blocker: userA, blocked: userB },
            { blocker: userB, blocked: userA }
        ]
    }).session(session ?? null);
    return exists !== null;
}

export const hasBlocked = async (blocker: Types.ObjectId | string, target: Types.ObjectId | string) => {
    const exists = await BlockModel.exists({ blocker, blocked: target });
    return exists !== null;
}

export const getBlockedUserIds = async (userId: Types.ObjectId | string) => {
    const blocks = await BlockModel.find({
        $or: [
            { blocker: userId },
            { blocked: userId }
        ]
    }).lean();

    const ids = new Set<Types.ObjectId>();
    for (const b of blocks) {
        if (!b.blocker.equals(userId)) ids.add(b.blocker);
        if (!b.blocked.equals(userId)) ids.add(b.blocked);
    }
    return Array.from(ids);
}

export const canBlock = (blocker: User & { _id: Types.ObjectId }, target: User & { _id: Types.ObjectId }) => {
    if (blocker._id.equals(target._id)) return false;
    if (target.roles.includes(RolesEnum.ADMIN)) return false;
    if (target.roles.includes(RolesEnum.MODERATOR) && !blocker.roles.includes(RolesEnum.ADMIN)) return false;
    return true;
};

export const getFollowingIds = async (userId: Types.ObjectId | string): Promise<Types.ObjectId[]> => {
    const relations = await UserFollowingModel.find({ user: userId })
        .select("following")
        .lean();

    return relations.map(r => r.following);
};

export type SuggestedUserResult = UserMinimal & { followersCount: number, isFollowing: boolean };

export interface GetSuggestedUsersParams {
    excludedIds: Types.ObjectId[];
    followingIds: Types.ObjectId[];
    limit: number;
    select?: Record<string, any>;
    userId?: Types.ObjectId;
}

export const fetchSuggestedUsers = async ({ excludedIds, followingIds, limit, select = {}, userId }: GetSuggestedUsersParams): Promise<SuggestedUserResult[]> => {
    return UserModel.aggregate<SuggestedUserResult>([
        {
            $match: {
                _id: { $nin: excludedIds },
                active: true,
                ...select
            }
        },
        {
            $lookup: {
                from: UserFollowingModel.collection.name,
                localField: "_id",
                foreignField: "following",
                as: "followersDocs"
            }
        },
        { $addFields: { followersCount: { $size: "$followersDocs" } } },
        {
            $addFields: {
                isFollowing: userId
                    ? { $in: [userId, { $map: { input: "$followersDocs", as: "f", in: "$$f.user" } }] }
                    : false
            }
        },
        {
            $addFields: {
                mutualCount: {
                    $size: {
                        $setIntersection: [
                            { $map: { input: "$followersDocs", as: "f", in: "$$f.user" } },
                            followingIds
                        ]
                    }
                }
            }
        },
        {
            $addFields: {
                score: {
                    $add: [
                        { $multiply: ["$mutualCount", 50] },
                        { $multiply: ["$level", 40] },
                        { $multiply: ["$followersCount", 0.2] },
                        { $multiply: [{ $rand: {} }, 5] }
                    ]
                }
            }
        },
        { $sort: { score: -1 } },
        { $limit: limit },
        {
            $project: { ...USER_MINIMAL_FIELDS, followersCount: 1, isFollowing: 1 }
        }
    ]);
};