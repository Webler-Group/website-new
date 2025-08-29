"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protectRoute = async (req, res, next) => {
    if (!req.userId) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};
exports.default = protectRoute;
