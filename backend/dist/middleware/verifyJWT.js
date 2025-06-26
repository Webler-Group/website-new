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
const confg_1 = require("../confg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const deviceId = req.headers["X-Device-Id"];
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ") && typeof deviceId === "string") {
        const token = authHeader.split(" ")[1];
        jsonwebtoken_1.default.verify(token, confg_1.config.accessTokenSecret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
            if (!err) {
                const rawFingerprint = req.ip + req.headers["user-agent"] + deviceId;
                const match = yield bcrypt_1.default.compare(rawFingerprint, decoded.fingerprint);
                if (match) {
                    const userInfo = decoded.userInfo;
                    req.userId = userInfo.userId;
                    req.roles = userInfo.roles;
                }
            }
            next();
        }));
    }
    else {
        next();
    }
};
exports.default = verifyJWT;
