import { Types } from "mongoose";
import { UserMinimal } from "../models/User";
import { getImageUrl } from "../controllers/mediaController";

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