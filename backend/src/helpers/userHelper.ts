import {Request} from "express";
import crypto from "crypto";
import { DocumentType } from "@typegoose/typegoose";
import mongoose, {Types} from "mongoose";
import UserModel, {User, USER_MINIMAL_FIELDS, UserAdminMinimal, UserMinimal} from "../models/User";
import IpModel from "../models/Ip";
import {getImageUrl} from "../controllers/mediaController";
import EmailChangeRecordModel from "../models/EmailChangeRecord";
import UserFollowingModel from "../models/UserFollowing";
import {deleteNotifications} from "./notificationHelper";
import NotificationTypeEnum from "../shared/data/NotificationTypeEnum";
import { BlockModel } from "../models/Block";
import RolesEnum from "../shared/data/RolesEnum";
import ChallengeDifficultyEnum from "../shared/data/ChallengeDifficultyEnum";

const MAX_IPS = 50;
const MAX_TRUSTED_DEVICES = 10;

export const hashDeviceId = (deviceId: string) =>
    crypto.createHash("sha256").update(deviceId).digest("hex");

export const generateVerificationCode = () =>
    crypto.randomInt(0, 1000000).toString().padStart(6, "0");

export const hashVerificationCode = (code: string) =>
    crypto.createHash("sha256").update(code).digest("hex");

/**
 * Checks whether the device is trusted for the user and refreshes its lastUsedAt.
 * The user document must be loaded with "+trustedDevices". Does not save the document.
 */
export const touchTrustedDevice = (user: DocumentType<User>, deviceHash: string) => {
    const device = user.trustedDevices?.find(d => d.hash === deviceHash);
    if (!device) return false;
    device.lastUsedAt = new Date();
    user.markModified("trustedDevices");
    return true;
};

/**
 * Adds the device to the user's trusted devices, evicting the least recently used ones over the limit.
 * The user document must be loaded with "+trustedDevices". Does not save the document.
 */
export const addTrustedDevice = (user: DocumentType<User>, deviceHash: string) => {
    if (touchTrustedDevice(user, deviceHash)) return;
    const devices = [...(user.trustedDevices ?? []), { hash: deviceHash, lastUsedAt: new Date() }];
    devices.sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime());
    user.trustedDevices = devices.slice(0, MAX_TRUSTED_DEVICES);
    user.markModified("trustedDevices");
};

/**
 * Real client IP. Relies on Express "trust proxy" (see server.ts): client-supplied headers such as
 * CF-Connecting-IP or X-Forwarded-For are never read directly, because anyone can send them.
 */
export const getRequestIp = (req: Request) => {
    const ip = req.ip;
    // Normalize IPv4-mapped IPv6 addresses (::ffff:1.2.3.4) so the same client is stored once
    return ip?.startsWith("::ffff:") ? ip.slice(7) : ip;
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

/** Follower/following counts of a user and whether the viewer follows them */
export const getFollowStats = async (userId: Types.ObjectId | string, currentUserId?: string) => {
    const [followers, following, isFollowing] = await Promise.all([
        UserFollowingModel.countDocuments({ following: userId }),
        UserFollowingModel.countDocuments({ user: userId }),
        currentUserId ? UserFollowingModel.exists({ user: currentUserId, following: userId }).then(x => x !== null) : false
    ]);
    return { followers, following, isFollowing };
}
