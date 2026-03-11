import mongoose from "mongoose";
import UserModel, { NotificationSettings } from "../models/User";
import connectDB from "../config/dbConn";
import { notificationTypeToField } from "../helpers/notificationHelper";

const defaultNotifications: NotificationSettings = {
    profileFollow: true,
    qaAnswer: true,
    codeComment: true,
    qaQuestionMention: true,
    qaAnswerMention: true,
    codeCommentMention: true,
    feedFollowerPost: true,
    feedComment: true,
    feedShare: true,
    feedPin: true,
    feedCommentMention: true,
    lessonComment: true,
    lessonCommentMention: true,
    channels: true,
};

const migrate = async () => {
    await connectDB();

    // Users with no notifications field at all
    await UserModel.updateMany(
        { notifications: { $exists: false } },
        { $set: { notifications: defaultNotifications } }
    );

    // Users with old numeric key format
    const oldFormatUsers = await UserModel.find({
        "notifications.profileFollow": { $exists: false },
        notifications: { $exists: true }
    }).lean();

    console.log(`Found ${oldFormatUsers.length} users with old notification format`);

    for (const user of oldFormatUsers) {
        const oldNotifications = user.notifications as unknown as Record<string, boolean>;

        const newNotifications: NotificationSettings = { ...defaultNotifications };

        for (const [numericKey, value] of Object.entries(oldNotifications)) {
            const enumKey = Number(numericKey);
            const field = notificationTypeToField[enumKey as keyof typeof notificationTypeToField];
            if (field) {
                newNotifications[field] = value;
            }
        }

        await UserModel.updateOne(
            { _id: user._id },
            { $set: { notifications: newNotifications } }
        );
    }

    console.log(`Migrated ${oldFormatUsers.length} users from old format`);
    await mongoose.disconnect();
};

migrate().catch(console.error);