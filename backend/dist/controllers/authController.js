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
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (typeof email == "undefined" || typeof password === "undefined") {
        return res.status(400).json({ message: "Some fields are missing" });
    }
    const user = yield User_1.default.findOne({ email });
    if (user && (yield user.matchPassword(password))) {
        if (!user.active) {
            return res.status(401).json({ message: "Account is deactivated" });
        }
        const accessToken = (0, tokenUtils_1.signAccessToken)({
            userInfo: {
                userId: user._id.toString(),
                nickname: user.name,
                roles: user.roles
            }
        });
        (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
        res.json({
            accessToken,
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
});
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, name, password } = req.body;
    if (typeof email == "undefined" || typeof password === "undefined") {
        return res.status(400).json({ message: "Some fields are missing" });
    }
    const userExists = yield User_1.default.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: "Email is already registered" });
    }
    const user = yield User_1.default.create({
        email,
        name,
        password
    });
    if (user) {
        const accessToken = (0, tokenUtils_1.signAccessToken)({
            userInfo: {
                userId: user._id.toString(),
                nickname: user.name,
                roles: user.roles
            }
        });
        (0, tokenUtils_1.generateRefreshToken)(res, { userId: user._id.toString() });
        res.json({
            accessToken,
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
});
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cookies = req.cookies;
    if (!(cookies === null || cookies === void 0 ? void 0 : cookies.jwt)) {
        return res.sendStatus(204);
    }
    (0, tokenUtils_1.clearRefreshToken)(res);
    res.json({});
});
const refresh = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cookies = req.cookies;
    if (!(cookies === null || cookies === void 0 ? void 0 : cookies.jwt)) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const refreshToken = cookies.jwt;
    jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            console.log(err);
            return res.status(403).json({ message: "Forbidden" });
        }
        const user = yield User_1.default.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const accessToken = (0, tokenUtils_1.signAccessToken)({
            userInfo: {
                userId: user._id.toString(),
                nickname: user.name,
                roles: user.roles
            }
        });
        res.json({ accessToken });
    }));
});
exports.default = {
    login,
    register,
    logout,
    refresh
};
