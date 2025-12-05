import webpush from "web-push";
import { config } from "../confg";
import NotificationKeystore from "../models/NotificationKeystore";
import NotificationSubscription from "../models/NotificationSubscription";
import User from "../models/User";
import { onlineUsers } from "../config/socketServer";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import mongoose from "mongoose";

export async function initKeystore() {
    const active = await NotificationKeystore.findOne({ version: "active" });
    if (active) return active;

    console.log("No active VAPID keys found, generating new...");
    const vapidKeys = webpush.generateVAPIDKeys();

    const newKeys = await NotificationKeystore.create({
        version: "active",
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
    });
    console.log("Generated new VAPID keys");

    return newKeys;
}

export async function sendPushToUsers(
    userIds: mongoose.Types.ObjectId[],
    payload: { title: string; body: string; url?: string }
) {
    const subs = await NotificationSubscription.find({ user: { $in: userIds } });
    if (subs.length === 0) return;

    const keys = await NotificationKeystore.findOne({ version: "active" });
    if (!keys) {
        console.log("Error: No VAPID keys available");
        return;
    }

    webpush.setVapidDetails(
        "mailto:" + config.adminEmail,
        keys.publicKey,
        keys.privateKey
    );

    const stringifiedPayload = JSON.stringify(payload);

    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                },
                stringifiedPayload
            );
        } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                console.log("Deleting expired subscription:", sub.endpoint);
                await NotificationSubscription.deleteOne({ _id: sub._id });
            } else {
                console.log("Push error:", err);
            }
        }
    }
}