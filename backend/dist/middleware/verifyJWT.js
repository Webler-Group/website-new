"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const confg_1 = require("../confg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const deviceId = req.headers["x-device-id"];
    req.deviceId = deviceId;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ") && typeof deviceId === "string") {
        const token = authHeader.split(" ")[1];
        jsonwebtoken_1.default.verify(token, confg_1.config.accessTokenSecret, async (err, decoded) => {
            const accessTokenPayload = decoded;
            if (!err) {
                const rawFingerprint = deviceId;
                const match = await bcrypt_1.default.compare(rawFingerprint, accessTokenPayload.fingerprint);
                if (match) {
                    const userInfo = accessTokenPayload.userInfo;
                    req.userId = userInfo.userId;
                    req.roles = userInfo.roles;
                }
            }
            next();
        });
    }
    else {
        next();
    }
};
exports.default = verifyJWT;
