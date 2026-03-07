import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";
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

    // --- Static ---
    static async generate(
        this: ModelType<EmailChangeRecord>,
        userId: Types.ObjectId,
        newEmail: string
    ): Promise<string | null> {
        const { default: User } = await import("./User");

        await EmailChangeRecordModel.deleteMany({ userId });
        const exists = await User.exists({ email: newEmail });
        if (exists) return null;

        const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
        await EmailChangeRecordModel.create({ userId, newEmail, code });
        return code;
    }
}

const EmailChangeRecordModel = getModelForClass(EmailChangeRecord);
export default EmailChangeRecordModel;