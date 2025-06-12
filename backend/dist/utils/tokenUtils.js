"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signEmailToken = exports.clearRefreshToken = exports.signAccessToken = exports.generateRefreshToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const confg_1 = require("../confg");
const generateRefreshToken = (res, payload) => {
    const refreshToken = jsonwebtoken_1.default.sign(payload, confg_1.config.refreshTokenSecret, { expiresIn: "7d" });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};
exports.generateRefreshToken = generateRefreshToken;
const clearRefreshToken = (res) => {
    res.clearCookie("refreshToken");
};
exports.clearRefreshToken = clearRefreshToken;
const signAccessToken = (payload) => {
    const accessToken = jsonwebtoken_1.default.sign(payload, confg_1.config.accessTokenSecret, { expiresIn: "30m" });
    const data = jsonwebtoken_1.default.decode(accessToken);
    return {
        accessToken,
        data
    };
};
exports.signAccessToken = signAccessToken;
const signEmailToken = (payload) => {
    const emailToken = jsonwebtoken_1.default.sign(payload, confg_1.config.emailTokenSecret, { expiresIn: "1h" });
    const data = jsonwebtoken_1.default.decode(emailToken);
    return {
        emailToken,
        data
    };
};
exports.signEmailToken = signEmailToken;
