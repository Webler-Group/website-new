import mongoose, { Document, InferSchemaType, Model, MongooseError } from "mongoose";
import bcrypt from "bcrypt";
import countryCodesEnum from "../config/countryCodes";
import RolesEnum from "../data/RolesEnum";
import Post from "./Post";
import Code from "./Code";
import Notification from "./Notification";
import { isEmail } from "../utils/regexUtils";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { levelFromXp } from "../utils/levelUtils";

const banSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    note: {
        type: String,
        trim: true,
        maxLength: 120
    },
    date: {
        type: Date,
        required: true
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    email: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [isEmail, 'invalid email']
    },
    password: {
        required: true,
        type: String
    },
    name: {
        type: String,
        trim: true,
        required: true,
        minLength: 3,
        maxLength: 20,
        unique: true
    },
    countryCode: {
        type: String,
        enum: countryCodesEnum,
        default: ""
    },
    bio: {
        type: String,
        trim: true,
        maxLength: 120,
        default: ""
    },
    roles: {
        type: [String],
        default: [RolesEnum.USER],
        enum: Object.values(RolesEnum)
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    lastVerificationEmailTimestamp: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    avatarImage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
        default: null
    },
    notifications: {
        [NotificationTypeEnum.CODE_COMMENT]: { type: Boolean, default: true },
        [NotificationTypeEnum.CODE_COMMENT_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum.FEED_COMMENT]: { type: Boolean, default: true },
        [NotificationTypeEnum.FEED_COMMENT_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum.FEED_FOLLOWER_POST]: { type: Boolean, default: true },
        [NotificationTypeEnum.FEED_PIN]: { type: Boolean, default: true },
        [NotificationTypeEnum.FEED_SHARE]: { type: Boolean, default: true },
        [NotificationTypeEnum.LESSON_COMMENT]: { type: Boolean, default: true },
        [NotificationTypeEnum.LESSON_COMMENT_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum.PROFILE_FOLLOW]: { type: Boolean, default: true },
        [NotificationTypeEnum.QA_ANSWER]: { type: Boolean, default: true },
        [NotificationTypeEnum.QA_ANSWER_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum.QA_QUESTION_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum.CHANNELS]: { type: Boolean, default: true }
    },
    ban: {
        type: banSchema,
        default: null
    },
    tokenVersion: {
        type: Number,
        default: 0
    },
    lastLoginAt: {
        type: Date
    },
    feed: {
        filter: {
            type: Number
        }
    }
},
    {
        timestamps: true
    });

userSchema.methods.matchPassword = async function (inputPassword: string) {
    return await bcrypt.compare(inputPassword, this.password);
}

userSchema.pre('save', async function (next) {
    if (this.isModified("password")) {
        if (this.password.length < 6) {
            return next(new Error("Password must contain at least 6 characters"));
        }

        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified("active")) {
        await Post.updateMany({ user: this._id }, { $set: { hidden: !this.active } });
        await Code.updateMany({ user: this._id }, { $set: { hidden: !this.active } });
        await Notification.updateMany({ actionUser: this._id }, { $set: { hidden: !this.active } });
    }

    if (this.isModified("xp")) {
        this.level = levelFromXp(this.xp);
    }

    return next();
});

declare interface IUser extends InferSchemaType<typeof userSchema> {
    roles: RolesEnum[];
    matchPassword(inputPassword: string): Promise<boolean>;
}

interface UserModel extends Model<IUser> {
}

const User = mongoose.model<IUser, UserModel>('User', userSchema);

export type IUserDocument = IUser & Document;
export default User;