import mongoose, { InferSchemaType, Model } from "mongoose";
import { isEmail } from "../utils/regexUtils";
import User from "./User";

const emailChangeRecordScheme = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    newEmail: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [isEmail, 'invalid email']
    },
    code: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

emailChangeRecordScheme.statics.generate = async function (userId: mongoose.Types.ObjectId, newEmail: string) {
    await EmailChangeRecord.deleteMany({ userId });
    const exists = await User.exists({ email: newEmail });
    if (exists) {
        return null;
    }
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    await EmailChangeRecord.create({
        userId,
        newEmail,
        code
    });

    return code;
}

declare interface IEmailChangeRecord extends InferSchemaType<typeof emailChangeRecordScheme> { }

interface EmailChangeRecordModel extends Model<IEmailChangeRecord> {
    generate(userId: mongoose.Types.ObjectId, newEmail: string): Promise<string | null>
}

const EmailChangeRecord = mongoose.model<IEmailChangeRecord, EmailChangeRecordModel>("EmailChangeRecord", emailChangeRecordScheme);

export default EmailChangeRecord;