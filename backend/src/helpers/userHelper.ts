import { Types } from "mongoose";
import UserModel, { UserMinimal } from "../models/User";
import { getImageUrl } from "../controllers/mediaController";
import EmailChangeRecordModel from "../models/EmailChangeRecord";

export const formatUserMinimal = (user: UserMinimal & { _id: Types.ObjectId }) => {
    return {
        id: user._id.toString(),
        name: user.name,
        avatarUrl: getImageUrl(user.avatarHash),
        countryCode: user.countryCode,
        level: user.level,
        roles: user.roles
    };
}

export const generateEmailChangeRecord = async (userId: Types.ObjectId, newEmail: string) => {
    await EmailChangeRecordModel.deleteMany({ userId });
    const exists = await UserModel.exists({ email: newEmail });
    if (exists) return null;

    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    await EmailChangeRecordModel.create({ userId, newEmail, code });
    return code;
}