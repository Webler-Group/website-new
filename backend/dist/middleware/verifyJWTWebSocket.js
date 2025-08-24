"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const confg_1 = require("../confg");
const verifyJWTWebSocket = async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const deviceId = socket.handshake.auth?.deviceId;
    if (typeof deviceId === "string") {
        socket.data.deviceId = deviceId;
    }
    if (typeof token !== "string") {
        return next();
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, confg_1.config.accessTokenSecret);
        const match = await bcrypt_1.default.compare(deviceId ?? "", decoded.fingerprint);
        if (!match) {
            return next();
        }
        socket.data.userId = decoded.userInfo.userId;
        socket.data.roles = decoded.userInfo.roles;
        return next();
    }
    catch (err) {
        return next();
    }
};
exports.default = verifyJWTWebSocket;
