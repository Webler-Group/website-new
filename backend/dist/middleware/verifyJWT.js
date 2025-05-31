"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const confg_1 = require("../confg");
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        jsonwebtoken_1.default.verify(token, confg_1.config.accessTokenSecret, (err, decoded) => {
            if (!err) {
                const userInfo = decoded.userInfo;
                req.userId = userInfo.userId;
                req.roles = userInfo.roles;
            }
        });
    }
    next();
};
exports.default = verifyJWT;
