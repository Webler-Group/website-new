"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const protectRoute = (requiredRoles = []) => {
    return async (req, res, next) => {
        if (!req.userId) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const user = await User_1.default.findById(req.userId, "active");
        if (!user || !user.active) {
            return res.status(403).json({ message: "Forbidden" });
        }
        if (requiredRoles.length > 0) {
            const hasRole = req.roles.some((role) => requiredRoles.includes(role));
            if (!hasRole) {
                return res.status(403).json({ message: "Insufficient role" });
            }
        }
        next();
    };
};
exports.default = protectRoute;
