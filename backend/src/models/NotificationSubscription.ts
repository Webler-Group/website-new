import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { Types } from "mongoose";

// --- NotificationSubscription ---
@modelOptions({ schemaOptions: { collection: "notificationsubscriptions", timestamps: true } })
export class NotificationSubscription {
    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ required: true, unique: true })
    endpoint!: string;

    @prop({ required: true })
    p256dh!: string;

    @prop({ required: true })
    auth!: string;

    @prop({ required: true, enum: ["old", "active", "candidate"] })
    vapidVersion!: string;
}

export const NotificationSubscriptionModel = getModelForClass(NotificationSubscription);