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
const bcrypt_1 = __importDefault(require("bcrypt"));
const confg_1 = require("../confg");
// Middleware function for Socket.IO
const verifyJWTWebSocket = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const token = (_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token;
    const deviceId = (_b = socket.handshake.auth) === null || _b === void 0 ? void 0 : _b.deviceId;
    // Validate presence of required auth data
    if (typeof token !== "string" || typeof deviceId !== "string") {
        return next(new Error("Unauthorized: Missing token or device ID"));
    }
    try {
        // Verify JWT and extract payload
        const decoded = jsonwebtoken_1.default.verify(token, confg_1.config.accessTokenSecret);
        // Compare the provided device ID to the hashed fingerprint in the token
        const match = yield bcrypt_1.default.compare(deviceId, decoded.fingerprint);
        if (!match) {
            return next(new Error("Unauthorized: Invalid device fingerprint"));
        }
        // Attach user info to socket for future use
        socket.data.userId = decoded.userInfo.userId;
        socket.data.roles = decoded.userInfo.roles;
        next();
    }
    catch (err) {
        const error = err;
        console.error("Socket JWT verification failed:", error.message);
        next(new Error("Unauthorized: Invalid or expired token"));
    }
});
exports.default = verifyJWTWebSocket;
