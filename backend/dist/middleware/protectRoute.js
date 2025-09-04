"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protectRoute = async (req, res, next) => {
    if (!req.userId) {
        return res.status(403).json({ success: false, message: "Please Login First" });
    }
    next();
};
exports.default = protectRoute;
