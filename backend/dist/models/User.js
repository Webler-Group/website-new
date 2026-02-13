"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const countryCodes_1 = __importDefault(require("../config/countryCodes"));
const RolesEnum_1 = __importDefault(require("../data/RolesEnum"));
const Post_1 = __importDefault(require("./Post"));
const Code_1 = __importDefault(require("./Code"));
const Notification_1 = __importDefault(require("./Notification"));
const regexUtils_1 = require("../utils/regexUtils");
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const levelUtils_1 = require("../utils/levelUtils");
const banSchema = new mongoose_1.default.Schema({
    author: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
        required: true,
        minLength: 3,
        maxLength: 20,
        unique: true
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
        default: [RolesEnum_1.default.USER],
        enum: Object.values(RolesEnum_1.default)
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
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "File",
        default: null
    },
    notifications: {
        [NotificationTypeEnum_1.default.CODE_COMMENT]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.CODE_COMMENT_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.FEED_COMMENT]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.FEED_COMMENT_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.FEED_FOLLOWER_POST]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.FEED_PIN]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.FEED_SHARE]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.LESSON_COMMENT]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.LESSON_COMMENT_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.PROFILE_FOLLOW]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.QA_ANSWER]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.QA_ANSWER_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.QA_QUESTION_MENTION]: { type: Boolean, default: true },
        [NotificationTypeEnum_1.default.CHANNELS]: { type: Boolean, default: true }
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
    if (this.isModified("xp")) {
        this.level = (0, levelUtils_1.levelFromXp)(this.xp);
    }
    return next();
});
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
