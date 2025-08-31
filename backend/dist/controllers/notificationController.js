"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
const NotificationKeystore_1 = __importDefault(require("../models/NotificationKeystore"));
const NotificationSubscription_1 = __importDefault(require("../models/NotificationSubscription"));
const getPublicKey = (0, express_async_handler_1.default)(async (req, res) => {
    const keys = await NotificationKeystore_1.default.findOne({ version: "active" });
    if (!keys) {
        res.status(404).json({ message: "Keys not found" });
        return;
    }
    res.json({ publicKey: keys.publicKey });
});
const subscribe = (0, express_async_handler_1.default)(async (req, res) => {
    const { subscription } = req.body;
    const currentUserId = req.userId;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        res.status(400).json({ message: "Invalid subscription payload" });
        return;
    }
    let savedSub = await NotificationSubscription_1.default.findOne({ endpoint: subscription.endpoint });
    if (savedSub) {
        savedSub.p256dh = subscription.keys.p256dh;
        savedSub.auth = subscription.keys.auth;
        savedSub.user = new mongoose_1.default.Types.ObjectId(currentUserId);
        savedSub.vapidVersion = "active";
        await savedSub.save();
    }
    else {
        savedSub = await NotificationSubscription_1.default.create({
            user: currentUserId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            vapidVersion: "active",
        });
    }
    res.json({
        subscription: {
            id: savedSub._id,
            endpoint: savedSub.endpoint,
            user: savedSub.user,
            vapidVersion: savedSub.vapidVersion,
            createdAt: savedSub.createdAt,
        }
    });
});
const unsubscribe = (0, express_async_handler_1.default)(async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
        res.status(404).json({ message: "Missing endpoint" });
        return;
    }
    await NotificationSubscription_1.default.deleteOne({ endpoint });
    res.json({ success: true, message: "Unsubscribed successfully" });
});
const controller = {
    getPublicKey,
    subscribe,
    unsubscribe,
};
exports.default = controller;
