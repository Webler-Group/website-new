"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const regexUtils_1 = require("../utils/regexUtils");
const User_1 = __importDefault(require("./User"));
const emailChangeRecordScheme = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
    newEmail: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [regexUtils_1.isEmail, 'invalid email']
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
emailChangeRecordScheme.statics.generate = async function (userId, newEmail) {
    await EmailChangeRecord.deleteMany({ userId });
    const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const count = await User_1.default.countDocuments({ email: newEmail });
    if (count != 0) {
        throw new Error("Email is already used");
    }
    await EmailChangeRecord.create({
        userId,
        newEmail,
        code
    });
    return code;
};
const EmailChangeRecord = mongoose_1.default.model("EmailChangeRecord", emailChangeRecordScheme);
exports.default = EmailChangeRecord;
