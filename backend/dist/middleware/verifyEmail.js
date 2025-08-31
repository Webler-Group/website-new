"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const verifyEmail = async (req, res, next) => {
    if (!(await User_1.default.findById(req.userId))?.emailVerified) {
        return res.status(403).json({ message: "Please verify your email address in your profile settings (Email section)." });
    }
    next();
};
exports.default = verifyEmail;
