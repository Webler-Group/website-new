import { prop, getModelForClass, modelOptions, index } from "@typegoose/typegoose";
import { Types } from "mongoose";

export const LOGIN_VERIFICATION_TTL_MS = 15 * 60 * 1000;
export const LOGIN_VERIFICATION_MAX_ATTEMPTS = 5;

@modelOptions({ schemaOptions: { collection: "loginverificationrecords", timestamps: true } })
@index({ userId: 1, deviceHash: 1 }, { unique: true })
@index({ createdAt: 1 }, { expireAfterSeconds: LOGIN_VERIFICATION_TTL_MS / 1000 })
export class LoginVerificationRecord {
    @prop({ ref: "User", required: true })
    userId!: Types.ObjectId;

    // SHA-256 hash of the device id the login was attempted from
    @prop({ required: true })
    deviceHash!: string;

    // SHA-256 hash of the verification code
    @prop({ required: true })
    codeHash!: string;

    @prop({ default: 0 })
    attempts!: number;

    createdAt!: Date;
}

const LoginVerificationRecordModel = getModelForClass(LoginVerificationRecord);
export default LoginVerificationRecordModel;
