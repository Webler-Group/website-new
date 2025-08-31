"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const NotificationSubscriptionSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    vapidVersion: {
        type: String,
        enum: ["old", "active", "candidate"],
        required: true
    }
}, {
    timestamps: true
});
const NotificationSubscription = (0, mongoose_1.model)("NotificationSubscription", NotificationSubscriptionSchema);
exports.default = NotificationSubscription;
