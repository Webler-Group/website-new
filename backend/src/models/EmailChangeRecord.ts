import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { isEmail } from "../utils/regexUtils";

@modelOptions({ schemaOptions: { collection: "emailchangerecords", timestamps: true } })
export class EmailChangeRecord {
    @prop({ ref: "User", required: true })
    userId!: Types.ObjectId;

    @prop({
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [isEmail, "invalid email"]
    })
    newEmail!: string;

    @prop({ required: true })
    code!: string;

    @prop({ default: 0 })
    attempts!: number;

    createdAt!: Date;
}

const EmailChangeRecordModel = getModelForClass(EmailChangeRecord);
export default EmailChangeRecordModel;