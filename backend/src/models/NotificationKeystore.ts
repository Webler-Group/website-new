import { Schema, model, InferSchemaType } from "mongoose";

const notificationKeystoreSchema = new Schema({
    version: {
        type: String,
        enum: ["old", "active", "candidate"],
        required: true,
        unique: true
    },
    publicKey: { type: String, required: true },
    privateKey: { type: String, required: true },
}, {
    timestamps: true
});

declare interface IPushKeystore extends InferSchemaType<typeof notificationKeystoreSchema> { }

const NotificationKeystore = model<IPushKeystore>("PushKeystore", notificationKeystoreSchema);

export default NotificationKeystore;
