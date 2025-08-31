"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToUsers = exports.initKeystore = void 0;
const web_push_1 = __importDefault(require("web-push"));
const confg_1 = require("../confg");
const NotificationKeystore_1 = __importDefault(require("../models/NotificationKeystore"));
const NotificationSubscription_1 = __importDefault(require("../models/NotificationSubscription"));
const User_1 = __importDefault(require("../models/User"));
const socketServer_1 = require("../config/socketServer");
async function initKeystore() {
    const active = await NotificationKeystore_1.default.findOne({ version: "active" });
    if (active)
        return active;
    console.log("No active VAPID keys found, generating new...");
    const vapidKeys = web_push_1.default.generateVAPIDKeys();
    const newKeys = await NotificationKeystore_1.default.create({
        version: "active",
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
    });
    console.log("Generated new VAPID keys");
    return newKeys;
}
exports.initKeystore = initKeystore;
async function sendToUsers(userIds, payload, category) {
    // filter out online users
    const offlineUserIds = userIds.filter(userId => !socketServer_1.onlineUsers.has(userId));
    if (offlineUserIds.length === 0)
        return;
    const allowedUserDocs = await User_1.default.find({
        _id: { $in: offlineUserIds },
        [`notifications.${category}`]: true
    }).select('_id');
    const allowedUserIds = allowedUserDocs.map(doc => doc._id);
    const subs = await NotificationSubscription_1.default.find({ user: { $in: allowedUserIds } });
    if (subs.length === 0)
        return;
    const keys = await NotificationKeystore_1.default.findOne({ version: "active" });
    if (!keys)
        throw new Error("No VAPID keys available");
    web_push_1.default.setVapidDetails("mailto:" + confg_1.config.adminEmail, keys.publicKey, keys.privateKey);
    const stringifiedPayload = JSON.stringify(payload);
    for (const sub of subs) {
        try {
            await web_push_1.default.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            }, stringifiedPayload);
        }
        catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                console.log("Deleting expired subscription:", sub.endpoint);
                await NotificationSubscription_1.default.deleteOne({ _id: sub._id });
            }
            else {
                console.error("Push error:", err);
            }
        }
    }
}
exports.sendToUsers = sendToUsers;
