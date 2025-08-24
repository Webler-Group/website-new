import { Schema, model } from "mongoose";

const NotificationSubscriptionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

const NotificationSubscription = model("NotificationSubscription", NotificationSubscriptionSchema);

export default NotificationSubscription;