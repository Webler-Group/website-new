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
const verifyJWTWebSocket = (socket, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const token = (_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token;
    const deviceId = (_b = socket.handshake.auth) === null || _b === void 0 ? void 0 : _b.deviceId;
    if (typeof deviceId === "string") {
        socket.data.deviceId = deviceId;
    }
    if (typeof token !== "string") {
        return next();
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, confg_1.config.accessTokenSecret);
        const match = yield bcrypt_1.default.compare(deviceId !== null && deviceId !== void 0 ? deviceId : "", decoded.fingerprint);
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
});
exports.default = verifyJWTWebSocket;
