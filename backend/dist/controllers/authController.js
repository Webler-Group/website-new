"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const tokenUtils_1 = require("../utils/tokenUtils");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const email_1 = require("../services/email");
const captcha_1 = require("../utils/captcha");
const CaptchaRecord_1 = __importDefault(require("../models/CaptchaRecord"));
const confg_1 = require("../confg");
const login = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    const deviceId = req.headers["x-device-id"];
    if (!deviceId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    if (typeof email === "undefined" || typeof password === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    const user = await User_1.default.findOne({ email });
    if (user && (await user.matchPassword(password))) {
        if (!user.active) {
            res.status(401).json({ success: false, message: "Account is deactivated" });
            return;
        }
        const { accessToken, data: tokenInfo } = await (0, tokenUtils_1.signAccessToken)({
            userId: user._id.toString(),
            roles: user.roles
        }, deviceId);
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        await (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
        res.json({
            accessToken,
            expiresIn,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarImage: user.avatarImage,
                roles: user.roles,
                emailVerified: user.emailVerified,
                countryCode: user.countryCode,
                registerDate: user.createdAt,
                level: user.level,
                xp: user.xp
            }
        });
    }
    else {
        res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});
const register = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, name, password, solution, captchaId } = req.body;
    const deviceId = req.headers["x-device-id"];
    if (!deviceId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    if (typeof email === "undefined" || typeof password === "undefined" || typeof solution === "undefined" || typeof captchaId === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    const record = await CaptchaRecord_1.default.findById(captchaId);
    if (record === null || !(0, captcha_1.verifyCaptcha)(solution, record.encrypted)) {
        res.status(403).json({ message: "Captcha verification failed" });
        return;
    }
    await CaptchaRecord_1.default.deleteOne({ _id: captchaId });
    const userExists = await User_1.default.findOne({ email });
    if (userExists) {
        res.status(400).json({ success: false, message: "Email is already registered" });
        return;
    }
    const user = await User_1.default.create({
        email,
        name,
        password,
        emailVerified: confg_1.config.nodeEnv == "development"
    });
    if (user) {
        const { accessToken, data: tokenInfo } = await (0, tokenUtils_1.signAccessToken)({
            userId: user._id.toString(),
            roles: user.roles
        }, deviceId);
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        await (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
        const { emailToken } = (0, tokenUtils_1.signEmailToken)({
            userId: user._id.toString(),
            email: user.email,
            action: "verify-email"
        });
        if (confg_1.config.nodeEnv === "production") {
            try {
                await (0, email_1.sendActivationEmail)(user.name, user.email, user._id.toString(), emailToken);
                user.lastVerificationEmailTimestamp = Date.now();
                await user.save();
            }
            catch {
                console.log("Activation email could not be sent");
            }
        }
        res.json({
            accessToken,
            expiresIn,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarImage: user.avatarImage,
                roles: user.roles,
                emailVerified: user.emailVerified,
                countryCode: user.countryCode,
                registerDate: user.createdAt,
                level: user.level,
                xp: user.xp
            }
        });
    }
    else {
        res.status(401).json({ success: false, message: "Invalid email or password" });
    }
});
const logout = (0, express_async_handler_1.default)(async (req, res) => {
    const cookies = req.cookies;
    if (cookies?.refreshToken) {
        (0, tokenUtils_1.clearRefreshToken)(res);
    }
    res.json({});
});
const refresh = (0, express_async_handler_1.default)(async (req, res) => {
    const deviceId = req.headers["x-device-id"];
    const cookies = req.cookies;
    if (!cookies?.refreshToken || !deviceId) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }
    const refreshToken = cookies.refreshToken;
    jsonwebtoken_1.default.verify(refreshToken, confg_1.config.refreshTokenSecret, async (err, decoded) => {
        if (err) {
            res.status(403).json({ success: false, message: "Please Login First" });
            return;
        }
        const payload = decoded;
        const user = await User_1.default.findById(payload.userId).select('roles active tokenVersion');
        if (!user || !user.active || payload.tokenVersion !== user.tokenVersion) { // NEW: Check version
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { accessToken, data: tokenInfo } = await (0, tokenUtils_1.signAccessToken)({
            userId: user._id.toString(),
            roles: user.roles
        }, deviceId);
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        res.json({
            accessToken,
            expiresIn
        });
    });
});
const sendPasswordResetCode = (0, express_async_handler_1.default)(async (req, res) => {
    const { email } = req.body;
    if (typeof email === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    const user = await User_1.default.findOne({ email }).lean();
    if (user === null) {
        res.status(404).json({ success: false, message: "Email is not registered" });
        return;
    }
    const { emailToken } = (0, tokenUtils_1.signEmailToken)({
        userId: user._id.toString(),
        email: user.email,
        action: "reset-password"
    });
    try {
        await (0, email_1.sendPasswordResetEmail)(user.name, user.email, user._id.toString(), emailToken);
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ success: false, message: "Email could not be sent" });
    }
});
const resetPassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { token, password, resetId } = req.body;
    if (typeof password === "undefined" || typeof token === "undefined" || typeof resetId === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    jsonwebtoken_1.default.verify(token, confg_1.config.emailTokenSecret, async (err, decoded) => {
        if (!err) {
            const userId = decoded.userId;
            if (userId !== resetId || decoded.action != "reset-password") {
                res.json({ success: false });
                return;
            }
            const user = await User_1.default.findById(resetId);
            if (user === null) {
                res.status(404).json({ success: false, message: "User not found" });
                return;
            }
            user.password = password;
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            try {
                await user.save();
                const cookies = req.cookies;
                if (cookies?.refreshToken) {
                    (0, tokenUtils_1.clearRefreshToken)(res);
                }
                res.json({ success: true });
            }
            catch (err) {
                res.json({ success: false });
            }
        }
        else {
            res.json({ success: false });
        }
    });
});
const generateCaptcha = (0, express_async_handler_1.default)(async (req, res) => {
    const { base64ImageDataURI, encrypted } = await (0, captcha_1.getCaptcha)();
    const record = await CaptchaRecord_1.default.create({ encrypted });
    const date = new Date(Date.now() - 15 * 60 * 1000);
    await CaptchaRecord_1.default.deleteMany({ createdAt: { $lt: date } });
    res.json({
        captchaId: record._id,
        imageData: base64ImageDataURI,
    });
});
const verifyEmail = (0, express_async_handler_1.default)(async (req, res) => {
    const { token, userId } = req.body;
    if (typeof token === "undefined" || typeof userId === "undefined") {
        res.status(400).json({ success: false, message: "Some fields are missing" });
        return;
    }
    jsonwebtoken_1.default.verify(token, confg_1.config.emailTokenSecret, async (err, decoded) => {
        if (!err) {
            const userId2 = decoded.userId;
            const email = decoded.email;
            if (userId2 !== userId || decoded.action != "verify-email") {
                res.json({ success: false });
                return;
            }
            const user = await User_1.default.findById(userId);
            if (user === null) {
                res.status(404).json({ success: false, message: "User not found" });
                return;
            }
            if (user.email !== email) {
                res.json({ success: false });
                return;
            }
            user.emailVerified = true;
            try {
                await user.save();
                res.json({ success: true });
            }
            catch (err) {
                res.json({ success: false });
            }
        }
        else {
            res.json({ success: false });
        }
    });
});
const controller = {
    login,
    register,
    logout,
    refresh,
    sendPasswordResetCode,
    resetPassword,
    generateCaptcha,
    verifyEmail
};
exports.default = controller;
