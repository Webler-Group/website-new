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
const verifyEmail = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!((_a = (yield User_1.default.findById(req.userId))) === null || _a === void 0 ? void 0 : _a.emailVerified)) {
        return res.status(403).json({ message: "Please verify your email address in your profile settings (Email section)." });
    }
    next();
});
exports.default = verifyEmail;
