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
const login = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (typeof email == "undefined" || typeof password === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const user = yield User_1.default.findOne({ email });
    if (user && (yield user.matchPassword(password))) {
        if (!user.active) {
            res.status(401).json({ message: "Account is deactivated" });
            return;
        }
        const { accessToken, data: tokenInfo } = (0, tokenUtils_1.signAccessToken)({
            userInfo: {
                userId: user._id.toString(),
                roles: user.roles
            }
        });
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
        res.json({
            accessToken,
            expiresIn,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
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
    const { email, name, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const userExists = yield User_1.default.findOne({ email });
    if (userExists) {
        res.status(400).json({ message: "Email is already registered" });
        return;
    }
    const user = yield User_1.default.create({
        email,
        name,
        password,
    });
    if (user) {
        const { accessToken, data: tokenInfo } = (0, tokenUtils_1.signAccessToken)({
            userInfo: {
                userId: user._id.toString(),
                roles: user.roles
            }
        });
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
        res.json({
            accessToken,
            expiresIn,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
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
    if (!(cookies === null || cookies === void 0 ? void 0 : cookies.refreshToken)) {
        res.status(204).json({});
        return;
    }
    (0, tokenUtils_1.clearRefreshToken)(res);
    res.json({});
}));
const refresh = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cookies = req.cookies;
    if (!(cookies === null || cookies === void 0 ? void 0 : cookies.refreshToken)) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const refreshToken = cookies.refreshToken;
    jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
        const user = yield User_1.default.findById(decoded.userId);
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { accessToken, data: tokenInfo } = (0, tokenUtils_1.signAccessToken)({
            userInfo: {
                userId: user._id.toString(),
                roles: user.roles
            }
        });
        const expiresIn = typeof tokenInfo.exp == "number" ?
            tokenInfo.exp * 1000 : 0;
        res.json({
            accessToken,
            expiresIn
        });
    }));
}));
const controller = {
    login,
    register,
    logout,
    refresh
};
exports.default = controller;
