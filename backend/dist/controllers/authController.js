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
const zodUtils_1 = require("../utils/zodUtils");
const authSchema_1 = require("../validation/authSchema");
const UserFollowing_1 = __importDefault(require("../models/UserFollowing"));
const login = (0, express_async_handler_1.default)(async (req, res) => {
    const { body, headers } = (0, zodUtils_1.parseWithZod)(authSchema_1.loginSchema, req);
    const { email, password } = body;
    const user = await User_1.default.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
        res.status(401).json({ error: [{ message: "Invalid email or password" }] });
        return;
    }
    if (!user.active) {
        res.status(401).json({ error: [{ message: "Account is deactivated" }] });
        return;
    }
    user.lastLoginAt = new Date();
    const { accessToken, data: tokenInfo } = await (0, tokenUtils_1.signAccessToken)({
        userId: user._id.toString(),
        roles: user.roles
    }, headers["x-device-id"]);
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
});
const register = (0, express_async_handler_1.default)(async (req, res) => {
    const { body, headers } = (0, zodUtils_1.parseWithZod)(authSchema_1.registerSchema, req);
    const { email, name, password, solution, captchaId } = body;
    const record = await CaptchaRecord_1.default.findById(captchaId).lean();
    if (record === null || !(0, captcha_1.verifyCaptcha)(solution, record.encrypted)) {
        res.status(403).json({ error: [{ message: "Captcha verification failed" }] });
        return;
    }
    await CaptchaRecord_1.default.deleteOne({ _id: captchaId });
    const emailExists = await User_1.default.exists({ email });
    const usernameExists = await User_1.default.exists({ name });
    if (emailExists || usernameExists) {
        let errors = [];
        if (emailExists) {
            errors.push({ message: "Email is already registered" });
        }
        if (usernameExists) {
            errors.push({ message: "Username is already used" });
        }
        res.status(400).json({ error: errors });
        return;
    }
    const user = await User_1.default.create({
        email,
        name,
        password,
        emailVerified: confg_1.config.nodeEnv == "development",
        lastLoginAt: new Date()
    });
    const { accessToken, data: tokenInfo } = await (0, tokenUtils_1.signAccessToken)({
        userId: user._id.toString(),
        roles: user.roles
    }, headers["x-device-id"]);
    const expiresIn = typeof tokenInfo.exp == "number" ?
        tokenInfo.exp * 1000 : 0;
    await (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
    if (confg_1.config.nodeEnv === "production") {
        const { emailToken } = (0, tokenUtils_1.signEmailToken)({
            userId: user._id.toString(),
            email: user.email,
            action: "verify-email"
        });
        try {
            await (0, email_1.sendActivationEmail)(user.name, user.email, user._id.toString(), emailToken);
            user.lastVerificationEmailTimestamp = Date.now();
            await user.save();
        }
        catch (err) {
            console.log("Activation email error:", err.message);
        }
    }
    const weblercodesUser = await User_1.default.exists({ email: confg_1.config.adminEmail });
    if (weblercodesUser) {
        await UserFollowing_1.default.create({ user: user._id, following: weblercodesUser._id });
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
});
const logout = (0, express_async_handler_1.default)(async (req, res) => {
    const cookies = req.cookies;
    if (cookies?.refreshToken) {
        (0, tokenUtils_1.clearRefreshToken)(res);
    }
    res.json({});
});
const refresh = (0, express_async_handler_1.default)(async (req, res) => {
    const { headers, cookies } = (0, zodUtils_1.parseWithZod)(authSchema_1.refreshSchema, req);
    jsonwebtoken_1.default.verify(cookies.refreshToken, confg_1.config.refreshTokenSecret, async (err, decoded) => {
        if (err) {
            res.status(403).json({ error: [{ message: "Please Login First" }] });
            return;
        }
        const payload = decoded;
        const user = await User_1.default.findById(payload.userId).select('roles active tokenVersion');
        if (!user || !user.active || payload.tokenVersion !== user.tokenVersion) { // NEW: Check version
            res.status(401).json({ error: [{ message: "Unauthorized" }] });
            return;
        }
        const { accessToken, data: tokenInfo } = await (0, tokenUtils_1.signAccessToken)({
            userId: user._id.toString(),
            roles: user.roles
        }, headers["x-device-id"]);
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        res.json({
            accessToken,
            expiresIn
        });
    });
});
const sendPasswordResetCode = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(authSchema_1.sendPasswordResetCodeSchema, req);
    const { email } = body;
    const user = await User_1.default.findOne({ email }).lean();
    if (user === null) {
        res.status(404).json({ error: [{ message: "Email is not registered" }] });
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
    catch (err) {
        console.log("REset email error:", err.message);
        res.status(500).json({ error: [{ message: "Email could not be sent" }] });
    }
});
const resetPassword = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(authSchema_1.resetPasswordSchema, req);
    const { token, password, resetId } = body;
    jsonwebtoken_1.default.verify(token, confg_1.config.emailTokenSecret, async (err, decoded) => {
        if (!err) {
            const userId = decoded.userId;
            if (userId !== resetId || decoded.action != "reset-password") {
                res.json({ error: [{ message: "Unauthorized" }] });
                return;
            }
            const user = await User_1.default.findById(resetId);
            if (user === null) {
                res.status(404).json({ error: [{ message: "User not found" }] });
                return;
            }
            user.password = password;
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            await user.save();
            const cookies = req.cookies;
            if (cookies?.refreshToken) {
                (0, tokenUtils_1.clearRefreshToken)(res);
            }
            res.json({ success: true });
        }
        else {
            res.json({ error: [{ message: "Invalid token" }] });
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
    const { body } = (0, zodUtils_1.parseWithZod)(authSchema_1.verifyEmailSchema, req);
    const { token, userId } = body;
    jsonwebtoken_1.default.verify(token, confg_1.config.emailTokenSecret, async (err, decoded) => {
        if (!err) {
            const userId2 = decoded.userId;
            const email = decoded.email;
            if (userId2 !== userId || decoded.action != "verify-email") {
                res.json({ error: [{ message: "Unauthorized" }] });
                return;
            }
            const user = await User_1.default.findById(userId);
            if (user === null) {
                res.status(404).json({ error: [{ message: "User not found" }] });
                return;
            }
            if (user.email !== email) {
                res.json({ error: [{ message: "Unauthorized" }] });
                return;
            }
            user.emailVerified = true;
            await user.save();
            res.json({ success: true });
        }
        else {
            res.json({ error: [{ message: "Invalid token" }] });
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
