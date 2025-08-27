import mongoose, { InferSchemaType, Model } from "mongoose";
import bcrypt from "bcrypt";
import countryCodesEnum from "../config/countryCodes";
import rolesEnum from "../data/roles";
import Post from "./Post";
import Code from "./Code";
import Notification from "./Notification";
import { v4 as uuid } from "uuid";

const isEmail = (value: string) => {
    const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return value.match(validEmailRegex) !== null;
}

const banSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    note: {
        type: String,
        trim: true
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
        default: "User_" + uuid().slice(0, 12),
        minLength: 3,
        maxLength: 20
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
        default: ["User"],  //Admin, Moderator, User
        enum: rolesEnum
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
        type: String,
        required: false
    },
    notifications: {
        followers: { type: Boolean, default: true },
        codes: { type: Boolean, default: true },
        discuss: { type: Boolean, default: true },
        channels: { type: Boolean, default: true },
    },
    ban: {
        type: banSchema,
        default: null
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

    return next();


})

declare interface IUser extends InferSchemaType<typeof userSchema> {
    matchPassword(inputPassword: string): Promise<boolean>;
}

interface UserModel extends Model<IUser> {
}

const User = mongoose.model<IUser, UserModel>('User', userSchema);

export default User;