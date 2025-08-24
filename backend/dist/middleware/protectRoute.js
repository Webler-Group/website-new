"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const protectRoute = async (req, res, next) => {
    if (!req.userId) {
        return res.status(403).json({ message: "Forbidden" });
    }
    const user = await User_1.default.findById(req.userId, "active");
    if (!user || !user.active) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};
exports.default = protectRoute;
