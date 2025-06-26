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
exports.signEmailToken = exports.clearRefreshToken = exports.signAccessToken = exports.generateRefreshToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const confg_1 = require("../confg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
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
const signAccessToken = (req, userInfo) => __awaiter(void 0, void 0, void 0, function* () {
    const deviceId = (0, uuid_1.v4)();
    const fingerprintRaw = req.ip + req.headers["user-agent"] + deviceId;
    const fingerprint = yield bcrypt_1.default.hash(fingerprintRaw, 10);
    const payload = {
        userInfo,
        fingerprint
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, confg_1.config.accessTokenSecret, { expiresIn: "30m" });
    const data = jsonwebtoken_1.default.decode(accessToken);
    return {
        accessToken,
        data,
        deviceId
    };
});
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
