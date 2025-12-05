"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signEmailToken = exports.clearRefreshToken = exports.signAccessToken = exports.generateRefreshToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const confg_1 = require("../confg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const generateRefreshToken = async (res, payload) => {
    const user = await User_1.default.findById(payload.userId, "tokenVersion");
    if (!user)
        throw new Error("User not found");
    const refreshPayload = {
        userId: payload.userId,
        tokenVersion: user.tokenVersion
    };
    const refreshToken = jsonwebtoken_1.default.sign(refreshPayload, confg_1.config.refreshTokenSecret, { expiresIn: "14d" });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: confg_1.config.nodeEnv === "production",
        maxAge: 14 * 24 * 60 * 60 * 1000
    });
};
exports.generateRefreshToken = generateRefreshToken;
const clearRefreshToken = (res) => {
    res.clearCookie("refreshToken");
};
exports.clearRefreshToken = clearRefreshToken;
const signAccessToken = async (userInfo, deviceId) => {
    const user = await User_1.default.findById(userInfo.userId).select('tokenVersion');
    if (!user)
        throw new Error('User not found');
    const fingerprintRaw = deviceId;
    const fingerprint = await bcrypt_1.default.hash(fingerprintRaw, 10);
    const payload = {
        userInfo,
        fingerprint,
        tokenVersion: user.tokenVersion // Include current version
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, confg_1.config.accessTokenSecret, { expiresIn: "15m" });
    const data = jsonwebtoken_1.default.decode(accessToken);
    return {
        accessToken,
        data
    };
};
exports.signAccessToken = signAccessToken;
const signEmailToken = (payload) => {
    const emailToken = jsonwebtoken_1.default.sign(payload, confg_1.config.emailTokenSecret, { expiresIn: "15m" });
    const data = jsonwebtoken_1.default.decode(emailToken);
    return {
        emailToken,
        data
    };
};
exports.signEmailToken = signEmailToken;
