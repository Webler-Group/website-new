import { Types } from "mongoose";
import { badge_t } from "../data/badges";
import UserModel, { User } from "../models/User";
import BadgeModel from "../models/Badge";
import { sendNotifications } from "./notificationHelper";
import NotificationTypeEnum from "../data/NotificationTypeEnum";

type user_t = User & {_id: Types.ObjectId };
type badgeRule_t = (user: user_t) => Promise<boolean> | boolean;

export type BadgeEventType = "email_verified";

const EVENT_BADGE_MAP: Record<BadgeEventType, badge_t[]> = {
  email_verified: ["first_step"],
};


const BADGE_RULES: Record<badge_t, badgeRule_t> = {

    first_step: (user: user_t) => {
        return user.emailVerified;
    },

    identity_set: (user: user_t) => {
        return Promise.resolve(false);
    },

    hello_world: (user: user_t) => {
        return Promise.resolve(false);
    },

    viral_spark: (user: user_t) => {
        return Promise.resolve(false);
    },

    first_voice: (user: user_t) => {
        return Promise.resolve(false);
    },

    crowd_builder: (user: user_t) => {
        return Promise.resolve(false);
    },

    influencer: (user: user_t) => {
        return Promise.resolve(false);
    },

    conversationist: (user: user_t) => {
        return Promise.resolve(false);
    },

    active_mind: (user: user_t) => {
        return Promise.resolve(false);
    },

    creator: (user: user_t) => {
        return Promise.resolve(false);
    },

    moderator: (user: user_t) => {
        return Promise.resolve(false);
    },

    level_5: (user: user_t) => {
        return Promise.resolve(false);
    },

    maxed_out: (user: user_t) => {
        return Promise.resolve(false);
    },

    plutomania: (user: user_t) => {
        return Promise.resolve(false);
    },

    xp_grinder: (user: user_t) => {
        return Promise.resolve(false);
    },

    dedicated: (user: user_t) => {
        return Promise.resolve(false);
    },

    legend: (user: user_t) => {
        return Promise.resolve(false);
    },

    mentor: (user: user_t) => {
        return Promise.resolve(false);
    },

    og_member: (user: user_t) => {
        return Promise.resolve(false);
    },

    marathoner: (user: user_t) => {
        return Promise.resolve(false);
    },

    unstoppable: (user: user_t) => {
        return Promise.resolve(false);
    }
}


export const unlockUserBadges = async (user: user_t, keys: badge_t[]): Promise<badge_t[]> => {

    const owned = new Set(user.badges.map(b => b.key));
    const unlocked: badge_t[] = [];

    const uniqueKeys = [...new Set(keys)];

    const badgeDocs = await BadgeModel.find({ key: { $in: uniqueKeys } }).lean();

    const badgeMap = new Map(badgeDocs.map(b => [b.key as badge_t, b]));

    const updates: any[] = [];

    for (const key of uniqueKeys) {

        if (owned.has(key)) continue;

        const rule = BADGE_RULES[key];
        if (!rule) continue;

        const passed = await rule(user);
        if (!passed) continue;

        const badge = badgeMap.get(key);
        if (!badge) continue;

        updates.push({ key, xp: badge.xpReward });

        unlocked.push(key);
        owned.add(key);
    }

    if (updates.length > 0) {

        await UserModel.updateOne(
            { _id: user._id },
            {
                $push: {
                badges: {
                    $each: updates.map(u => ({
                    key: u.key,
                    earnedAt: new Date()
                    }))
                }
                },
                $inc: {
                    xp: updates.reduce((sum, u) => sum + u.xp, 0)
                }
            }
        );
    }

    return unlocked;
};


const notifyBadgeUnlock = async (userId: Types.ObjectId, keys: badge_t[] ) => {
    await Promise.all(
        keys.map(key => {
        sendNotifications({
                title: "New Badge",
                type: NotificationTypeEnum.BADGES,
                actionUser: new Types.ObjectId(userId),
                message: `You have unlocked a new badge: ${key}"`,
                questionId: undefined,
                postId: undefined
            }, [userId]);

        })
    );
};


const processBadgeEvent = async (type: BadgeEventType, user: user_t) => {
    const badgeKeys = EVENT_BADGE_MAP[type];
    if (!badgeKeys) return;

    const unlocked = await unlockUserBadges(user, badgeKeys);

    if (unlocked.length > 0) {
        await notifyBadgeUnlock(user._id, unlocked);
    }
};


export const emitBadgeEvent = async (user: user_t, type: BadgeEventType) => {
    await processBadgeEvent(type, user);
};