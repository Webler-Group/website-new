import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import mongoose from "mongoose";
import NotificationKeystoreModel from "../models/NotificationKeystore";
import NotificationSubscriptionModel from "../models/NotificationSubscription";
import HttpError from "../exceptions/HttpError";

const getPublicKey = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const keys = await NotificationKeystoreModel.findOne({ version: "active" });
    if (!keys) {
        throw new HttpError("Keys not found", 404);
    }

    res.json({ success: true, data: { publicKey: keys.publicKey } });
});

const subscribe = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { subscription } = req.body;
    const currentUserId = req.userId;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        throw new HttpError("Invalid subscription payload", 400);
    }

    let savedSub = await NotificationSubscriptionModel.findOne({ endpoint: subscription.endpoint });
    if (savedSub) {
        savedSub.p256dh = subscription.keys.p256dh;
        savedSub.auth = subscription.keys.auth;
        savedSub.user = new mongoose.Types.ObjectId(currentUserId);
        savedSub.vapidVersion = "active";
        await savedSub.save();
    } else {
        savedSub = await NotificationSubscriptionModel.create({
            user: currentUserId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            vapidVersion: "active",
        });
    }

    res.json({
        success: true,
        data: {
            subscription: {
                id: savedSub._id,
                endpoint: savedSub.endpoint,
                user: savedSub.user,
                vapidVersion: savedSub.vapidVersion,
                createdAt: savedSub.createdAt,
            }
        }
    });
});

const unsubscribe = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { endpoint } = req.body;
    if (!endpoint) {
        throw new HttpError("Missing endpoint", 404);
    }

    await NotificationSubscriptionModel.deleteOne({ endpoint });

    res.json({ success: true });
});

const controller = {
    getPublicKey,
    subscribe,
    unsubscribe,
};

export default controller;
