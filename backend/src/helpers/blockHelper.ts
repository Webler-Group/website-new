import { Types } from "mongoose";
import { BlockModel } from "../models/Block";
import { User } from "../models/User";
import RolesEnum from "../data/RolesEnum";

export const isBlocked = async (userA: Types.ObjectId | string, userB: Types.ObjectId | string) => {
    return await BlockModel.exists({
        $or: [
            { blocker: userA, blocked: userB },
            { blocker: userB, blocked: userA }
        ]
    });
}


export const hasBlocked = async (blocker: Types.ObjectId | string, target: Types.ObjectId | string) => {
    return await BlockModel.exists({
        blocker,
        blocked: target
    });
}


/**
 * Retrieve all users in blocked list for subject and target
 * 
 * @param userId is the current user id
 * @returns users who have blocked me or who have been blocked by me A.K.A (Bi-directional)
 */
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
    if (blocker._id.equals(target._id))
        return false;

    if (target.roles.includes(RolesEnum.ADMIN))
        return false;

    if (target.roles.includes(RolesEnum.MODERATOR) && !blocker.roles.includes(RolesEnum.ADMIN)) {
        return false;
    }

    return true;
};