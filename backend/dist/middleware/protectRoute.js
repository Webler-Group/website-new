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
const User_1 = __importDefault(require("../models/User"));
const protectRoute = (requiredRoles = []) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        if (!req.userId) {
            return res.status(403).json({ message: "Forbidden" });
        }
        const user = yield User_1.default.findById(req.userId, "active");
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
    });
};
exports.default = protectRoute;
