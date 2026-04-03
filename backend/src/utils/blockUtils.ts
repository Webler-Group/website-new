import { BlockModel } from "../models/Block";

export async function isBlocked(userA: string, userB: string) {
    return await BlockModel.isBlocked(userA, userB);
}


export async function hasBlocked(blocker: string, target: string) {
    return await BlockModel.hasBlocked(blocker, target);
}


/**
 * Retrieve all users in blocked list for subject and target
 * 
 * @param userId is the current user id
 * @returns users who have blocked me or who have been blocked by me A.K.A (Bi-directional)
 */
export async function getBlockedUserIds(userId: string) {
    const blocks = await BlockModel.find({
        $or: [
            { blocker: userId },
            { blocked: userId }
        ]
    }).select("blocker blocked");

    const ids = new Set<string>();

    blocks.forEach((b) => {
        if (b.blocker.toString() !== userId) ids.add(b.blocker.toString());
        if (b.blocked.toString() !== userId) ids.add(b.blocked.toString());
    });

    return Array.from(ids);
}