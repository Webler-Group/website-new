"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const login = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (typeof email === "undefined" || typeof password === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const user = yield User_1.default.findOne({ email });
    if (user && (yield user.matchPassword(password))) {
        if (!user.active) {
            res.status(401).json({ message: "Account is deactivated" });
            return;
        }
        const { accessToken, data: tokenInfo, deviceId } = yield (0, tokenUtils_1.signAccessToken)(req, {
            userId: user._id.toString(),
            roles: user.roles
        });
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
        res.json({
            accessToken,
            expiresIn,
            deviceId,
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
        res.status(401).json({ message: "Invalid email or password" });
    }
}));
const register = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, name, password, solution, captchaId } = req.body;
    if (typeof email === "undefined" || typeof password === "undefined" || typeof solution === "undefined" || typeof captchaId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const record = yield CaptchaRecord_1.default.findById(captchaId);
    if (record === null || !(0, captcha_1.verifyCaptcha)(solution, record.encrypted)) {
        res.status(403).json({ message: "Captcha verification failed" });
        return;
    }
    yield CaptchaRecord_1.default.deleteOne({ _id: captchaId });
    const userExists = yield User_1.default.findOne({ email });
    if (userExists) {
        res.status(400).json({ message: "Email is already registered" });
        return;
    }
    const user = yield User_1.default.create({
        email,
        name,
        password,
        emailVerified: confg_1.config.nodeEnv == "development"
    });
    if (user) {
        const { accessToken, data: tokenInfo, deviceId } = yield (0, tokenUtils_1.signAccessToken)(req, {
            userId: user._id.toString(),
            roles: user.roles
        });
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
        res.json({
            accessToken,
            expiresIn,
            deviceId,
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
        res.status(401).json({ message: "Invalid email or password" });
    }
}));
const logout = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cookies = req.cookies;
    if (cookies === null || cookies === void 0 ? void 0 : cookies.refreshToken) {
        (0, tokenUtils_1.clearRefreshToken)(res);
    }
    res.json({});
}));
const refresh = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cookies = req.cookies;
    if (!(cookies === null || cookies === void 0 ? void 0 : cookies.refreshToken)) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const refreshToken = cookies.refreshToken;
    jsonwebtoken_1.default.verify(refreshToken, confg_1.config.refreshTokenSecret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
        const user = yield User_1.default.findById(decoded.userId);
        if (!user || !user.active) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { accessToken, data: tokenInfo, deviceId } = yield (0, tokenUtils_1.signAccessToken)(req, {
            userId: user._id.toString(),
            roles: user.roles
        });
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        res.json({
            accessToken,
            expiresIn,
            deviceId
        });
    }));
}));
const sendPasswordResetCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (typeof email === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const user = yield User_1.default.findOne({ email });
    if (user === null) {
        res.status(404).json({ message: "Email is not registered" });
        return;
    }
    const { emailToken } = (0, tokenUtils_1.signEmailToken)({
        userId: user._id.toString(),
        email: user.email
    });
    try {
        yield (0, email_1.sendPasswordResetEmail)(user.name, user.email, user._id.toString(), emailToken);
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ message: "Email could not be sent" });
    }
}));
const resetPassword = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, password, resetId } = req.body;
    if (typeof password === "undefined" || typeof token === "undefined" || typeof resetId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    jsonwebtoken_1.default.verify(token, confg_1.config.emailTokenSecret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
        if (!err) {
            const userId = decoded.userId;
            if (userId !== resetId) {
                res.json({ success: false });
                return;
            }
            const user = yield User_1.default.findById(resetId);
            if (user === null) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            user.password = password;
            try {
                yield user.save();
                const cookies = req.cookies;
                if (cookies === null || cookies === void 0 ? void 0 : cookies.refreshToken) {
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
    }));
}));
const generateCaptcha = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { base64ImageDataURI, encrypted } = yield (0, captcha_1.getCaptcha)();
    const record = yield CaptchaRecord_1.default.create({ encrypted });
    const date = new Date(Date.now() - 15 * 60 * 1000);
    yield CaptchaRecord_1.default.deleteMany({ createdAt: { $lt: date } });
    res.json({
        captchaId: record._id,
        imageData: base64ImageDataURI,
    });
}));
const verifyEmail = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, userId } = req.body;
    if (typeof token === "undefined" || typeof userId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    jsonwebtoken_1.default.verify(token, confg_1.config.emailTokenSecret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
        if (!err) {
            const userId2 = decoded.userId;
            const email = decoded.email;
            if (userId2 !== userId) {
                res.json({ success: false });
                return;
            }
            const user = yield User_1.default.findById(userId);
            if (user === null) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            if (user.email !== email) {
                res.json({ success: false });
                return;
            }
            user.emailVerified = true;
            try {
                yield user.save();
                res.json({ success: true });
            }
            catch (err) {
                res.json({ success: false });
            }
        }
        else {
            res.json({ success: false });
        }
    }));
}));
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
