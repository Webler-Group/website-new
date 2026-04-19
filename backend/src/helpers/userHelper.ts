import {Request} from "express";
import mongoose, {Types} from "mongoose";
import UserModel, {User, USER_MINIMAL_FIELDS, UserAdminMinimal, UserMinimal} from "../models/User";
import IpModel from "../models/Ip";
import {getImageUrl} from "../controllers/mediaController";
import EmailChangeRecordModel from "../models/EmailChangeRecord";
import UserFollowingModel from "../models/UserFollowing";
import {deleteNotifications} from "./notificationHelper";
import NotificationTypeEnum from "../data/NotificationTypeEnum";

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
        { upsert: true, new: true, session }
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


export const levelUtils = (() => {

    const MAX_LEVEL = 30;

    const xpRequiredForLevel = (level: number): number => {
        if (level <= 15) {
            return 200 + level * 80;
        }

        if (level <= 25) {
            return 2000 + level * 600;
        }

        return 20000 + level * level * 2500;
    };


    const totalXpToReachLevel = (level: number): number => {
        let total = 0;

        for (let i = 1; i < level; i++) {
            total += xpRequiredForLevel(i);
        }

        return total;
    };


    const fromXp = (xp: number): number => {
        let total = 0;

        for (let level = 1; level <= MAX_LEVEL; level++) {
            total += xpRequiredForLevel(level);

            if (xp < total) {
                return level;
            }
        }

        return MAX_LEVEL;
    };
    

    const xpForNextLevel = (level: number): number => {
        if (level >= MAX_LEVEL) return 0;
        return xpRequiredForLevel(level);
    };

    return {
        totalXpToReachLevel,
        fromXp,
        xpForNextLevel
    };

})();


export const deleteFollowAndCleanup = async (userId: Types.ObjectId, followingId: Types.ObjectId, session?: mongoose.ClientSession) => {
    await UserFollowingModel.deleteOne({ user: userId, following: followingId }, { session });
    await deleteNotifications({
        user: followingId,
        actionUser: userId,
        _type: NotificationTypeEnum.PROFILE_FOLLOW
    }, session);
}



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