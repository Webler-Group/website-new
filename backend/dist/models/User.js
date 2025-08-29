"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const countryCodes_1 = __importDefault(require("../config/countryCodes"));
const roles_1 = __importDefault(require("../data/roles"));
const Post_1 = __importDefault(require("./Post"));
const Code_1 = __importDefault(require("./Code"));
const Notification_1 = __importDefault(require("./Notification"));
const uuid_1 = require("uuid");
const regexUtils_1 = require("../utils/regexUtils");
const banSchema = new mongoose_1.default.Schema({
    author: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
const userSchema = new mongoose_1.default.Schema({
    email: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [regexUtils_1.isEmail, 'invalid email']
    },
    password: {
        required: true,
        type: String
    },
    name: {
        type: String,
        trim: true,
        default: "User_" + (0, uuid_1.v4)().slice(0, 12),
        minLength: 3,
        maxLength: 20
    },
    countryCode: {
        type: String,
        enum: countryCodes_1.default,
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
        enum: roles_1.default
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
        mentions: { type: Boolean, default: true },
    },
    ban: {
        type: banSchema,
        default: null
    },
    tokenVersion: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
userSchema.methods.matchPassword = async function (inputPassword) {
    return await bcrypt_1.default.compare(inputPassword, this.password);
};
userSchema.pre('save', async function (next) {
    if (this.isModified("password")) {
        if (this.password.length < 6) {
            return next(new Error("Password must contain at least 6 characters"));
        }
        const salt = await bcrypt_1.default.genSalt(10);
        this.password = await bcrypt_1.default.hash(this.password, salt);
    }
    if (this.isModified("active")) {
        await Post_1.default.updateMany({ user: this._id }, { $set: { hidden: !this.active } });
        await Code_1.default.updateMany({ user: this._id }, { $set: { hidden: !this.active } });
        await Notification_1.default.updateMany({ actionUser: this._id }, { $set: { hidden: !this.active } });
    }
    return next();
});
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
