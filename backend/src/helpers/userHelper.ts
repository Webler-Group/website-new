import { Request } from "express";
import mongoose, { Types } from "mongoose";
import UserModel, { User, UserAdminMinimal, UserMinimal } from "../models/User";
import IpModel from "../models/Ip";
import { getImageUrl } from "../controllers/mediaController";
import EmailChangeRecordModel from "../models/EmailChangeRecord";
import UserFollowingModel from "../models/UserFollowing";
import { deleteNotifications } from "./notificationHelper";
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

export const formatUserMinimal = (user: UserMinimal & { _id: Types.ObjectId }) => {
    return {
        id: user._id.toString(),
        name: user.name,
        avatarUrl: getImageUrl(user.avatarHash),
        countryCode: user.countryCode,
        level: user.level,
        roles: user.roles,
        active: user.active,
        isFollowing: false
    };
}

export const formatUserAdminMinimal = (user: UserAdminMinimal & { _id: Types.ObjectId }) => {
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