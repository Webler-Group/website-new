"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const userSettingsSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
    notifications: {
        followers: { type: Boolean, default: true },
        codes: { type: Boolean, default: true },
        discuss: { type: Boolean, default: true },
        channels: { type: Boolean, default: true },
    }
});
const UserSettings = mongoose_1.default.model("UserSettings", userSettingsSchema);
exports.default = UserSettings;
