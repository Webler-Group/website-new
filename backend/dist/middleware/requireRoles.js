"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requireRoles = (requiredRoles = []) => {
    return async (req, res, next) => {
        if (requiredRoles.length > 0) {
            const hasRole = req.roles && req.roles.some((role) => requiredRoles.includes(role));
            if (!hasRole) {
                return res.status(403).json({ message: "Insufficient role" });
            }
        }
        next();
    };
};
exports.default = requireRoles;
