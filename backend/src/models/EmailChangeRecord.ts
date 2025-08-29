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
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const count = await User.countDocuments({ email: newEmail });
    if (count != 0) {
        throw new Error("Email is already used");
    }
    await EmailChangeRecord.create({
        userId,
        newEmail,
        code
    });

    return code;
}

declare interface IEmailChangeRecord extends InferSchemaType<typeof emailChangeRecordScheme> { }

interface EmailChangeRecordModel extends Model<IEmailChangeRecord> {
    generate(userId: mongoose.Types.ObjectId, newEmail: string): Promise<string>
}

const EmailChangeRecord = mongoose.model<IEmailChangeRecord, EmailChangeRecordModel>("EmailChangeRecord", emailChangeRecordScheme);

export default EmailChangeRecord;