import mongoose, { InferSchemaType } from "mongoose";
import bcrypt from "bcrypt";
import countryCodesEnum from "../config/countryCodes";
import isEmail from "validator/lib/isEmail";
import rolesEnum from "../data/roles";

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
        default: "Weblerian",
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
        default: ["User"],
        enum: rolesEnum
    },
    emailVerified: {
        type: Boolean,
        default: false
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
    avatarUrl: {
        type: String
    }
},
    {
        timestamps: true
    });

userSchema.methods.matchPassword = async function (inputPassword: string) {
    return await bcrypt.compare(inputPassword, this.password);
}

userSchema.pre('save', async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    if (this.password.length < 6) {
        return next(new Error("Password must contain at least 6 characters"));
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
})

declare interface IUser extends InferSchemaType<typeof userSchema> {
    matchPassword(inputPassword: string): Promise<boolean>
}

const User = mongoose.model<IUser>('User', userSchema);

export default User;