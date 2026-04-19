import { Types } from "mongoose";
import { badge_t } from "../data/badges";
import UserModel, { User } from "../models/User";
import BadgeModel from "../models/Badge";
import { sendNotifications } from "./notificationHelper";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import RolesEnum from "../data/RolesEnum";
import { getFollowingIds } from "./userHelper";
import UserFollowingModel from "../models/UserFollowing";

type user_t = User & {_id: Types.ObjectId };
type badgeRule_t = (user: user_t) => Promise<boolean> | boolean;

export type BadgeEventType = "email_verified" |
    "role_updated" |
    "profile_updated" |
    "xp_updated" |
    "post_liked" |
    "follower_updated";


const EVENT_BADGE_MAP: Record<BadgeEventType, badge_t[]> = {
    email_verified: ["first_step", "og_member"],
    role_updated: ["creator", "moderator"],
    profile_updated: ["identity_set"],
    xp_updated: ["level_5", "maxed_out", "plutomania", "xp_grinder", "dedicated", "legend"],
    follower_updated: ["crowd_builder", "influencer"],
    post_liked: ["hello_world", "viral_spark"],
};


const BADGE_RULES: Record<badge_t, badgeRule_t> = {

    first_step: (user: user_t) => {
        return user.emailVerified;
    },


    creator: (user: user_t) => {
        return user.roles.includes(RolesEnum.CREATOR);
    },


    moderator: (user: user_t) => {
        return user.roles.includes(RolesEnum.MODERATOR);
    },


    identity_set: (user: user_t) => {
        return user.name.length > 0 &&
            user.bio.length > 0 &&
            (user.countryCode != undefined && user.countryCode.length > 0) &&
            (user.avatarHash != undefined && user.avatarHash.length > 0);
    },


    og_member: async(user: user_t) => {
        const userCount = await UserModel.estimatedDocumentCount();
        return Promise.resolve((userCount <= 500));
    },


    level_5: (user: user_t) => {
        return user.level >= 5;
    },


    maxed_out: (user: user_t) => {
        return user.level >= 30;
    },


    plutomania: (user: user_t) => {
        return user.xp >= 17000;
    },


    xp_grinder: (user: user_t) => {
        return user.xp >= 25000;
    },


    dedicated: (user: user_t) => {
        return user.xp >= 50000;
    },


    legend: (user: user_t) => {
        return user.xp >= 75000;
    },


    crowd_builder: async(user: user_t) => {
        const followers = await UserFollowingModel.countDocuments({ following: user._id });
        return Promise.resolve(followers >= 50);
    },

    influencer: async(user: user_t) => {
        const followers = await UserFollowingModel.countDocuments({ following: user._id });
        return Promise.resolve(followers >= 1000);
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

    conversationist: (user: user_t) => {
        return Promise.resolve(false);
    },

    active_mind: (user: user_t) => {
        return Promise.resolve(false);
    },

   
    mentor: (user: user_t) => {
        return Promise.resolve(false);
    },


    marathoner: (user: user_t) => {
        return Promise.resolve(false);
    },


    unstoppable: (user: user_t) => {
        return Promise.resolve(false);
    }
}


const unlockUserBadges = async (user: user_t, keys: badge_t[]): Promise<badge_t[]> => {

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