"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const captchaRecordScheme = new mongoose_1.default.Schema({
    encrypted: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});
const CaptchaRecord = mongoose_1.default.model("CaptchaRecord", captchaRecordScheme);
exports.default = CaptchaRecord;
