import { Request } from "express";
import { Types } from "mongoose";
import UserModel, { User, UserAdmin, UserMinimal } from "../models/User";
import { getImageUrl } from "../controllers/mediaController";
import EmailChangeRecordModel from "../models/EmailChangeRecord";

const MAX_IPS = 50;

export const getRequestIp = (req: Request) => {
    return (
        (req.headers["cf-connecting-ip"] as string) ||
        (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
        req.ip
    );
};

export const updateUserIp = async (userId: Types.ObjectId, ip: string) => {
    await UserModel.updateOne(
        { _id: userId },
        [
            {
                $set: {
                    lastIp: ip,
                    ips: {
                        $slice: [
                            { $setUnion: [{ $ifNull: ["$ips", []] }, [ip]] },
                            -MAX_IPS
                        ]
                    }
                }
            }
        ],
        { updatePipeline: true }
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

export const formatUserAdmin = (user: UserAdmin & { _id: Types.ObjectId }) => {
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
        ban: user.ban
            ? { author: user.ban.author, note: user.ban.note, date: user.ban.date }
            : null,
        ips: user.ips,
        lastIp: user.lastIp
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