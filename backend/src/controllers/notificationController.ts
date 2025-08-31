import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import mongoose from "mongoose";
import NotificationKeystore from "../models/NotificationKeystore";
import NotificationSubscription from "../models/NotificationSubscription";

const getPublicKey = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const keys = await NotificationKeystore.findOne({ version: "active" });
    if (!keys) {
        res.status(404).json({ message: "Keys not found" });
        return;
    }

    res.json({ publicKey: keys.publicKey });
});

const subscribe = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { subscription } = req.body;
    const currentUserId = req.userId;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        res.status(400).json({ message: "Invalid subscription payload" });
        return;
    }

    let savedSub = await NotificationSubscription.findOne({ endpoint: subscription.endpoint });
    if (savedSub) {
        savedSub.p256dh = subscription.keys.p256dh;
        savedSub.auth = subscription.keys.auth;
        savedSub.user = new mongoose.Types.ObjectId(currentUserId);
        savedSub.vapidVersion = "active";
        await savedSub.save();
    } else {
        savedSub = await NotificationSubscription.create({
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

const unsubscribe = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { endpoint } = req.body;
    if (!endpoint) {
        res.status(404).json({ message: "Missing endpoint" });
        return;
    }

    await NotificationSubscription.deleteOne({ endpoint });
    res.json({ success: true, message: "Unsubscribed successfully" });
});

const controller = {
    getPublicKey,
    subscribe,
    unsubscribe,
};

export default controller;
