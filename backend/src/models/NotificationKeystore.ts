import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";

// --- NotificationKeystore ---
@modelOptions({ schemaOptions: { collection: "pushkeystores", timestamps: true } })
export class NotificationKeystore {
    @prop({ required: true, unique: true, enum: ["old", "active", "candidate"] })
    version!: string;

    @prop({ required: true })
    publicKey!: string;

    @prop({ required: true })
    privateKey!: string;

    createdAt!: Date;
}

const NotificationKeystoreModel = getModelForClass(NotificationKeystore);
export default NotificationKeystoreModel;