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
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const userId = req.params.userId;
    const user = yield User_1.default.findById(userId).select("-password");
    if (!user) {
        return res.status(404).json({ message: "Profile not found" });
    }
    res.json({
        userDetails: {
            id: user._id,
            name: user.name,
            email: currentUserId === user._id.toString() ? user.email : null,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            roles: user.roles,
            emailVerified: user.emailVerified,
            countryCode: user.countryCode,
            followers: user.followers,
            following: user.following,
            isFollowing: false,
            registerDate: user.createdAt,
            level: user.level,
            xp: user.xp
        }
    });
});
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const userId = req.params.userId;
    const { email, name, bio, countryCode } = req.body;
    if (currentUserId !== userId) {
        return res.status(401).json({ message: "Not authorized for this action" });
    }
    const user = yield User_1.default.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "Profile not found" });
    }
    if (typeof email !== "undefined") {
        user.email = email;
    }
    if (typeof name !== "undefined") {
        user.name = name;
    }
    if (typeof bio !== "undefined") {
        user.bio = bio;
    }
    if (typeof countryCode !== "undefined") {
        user.countryCode = countryCode;
    }
    try {
        const updatedUser = yield user.save();
        res.json({
            success: true,
            errors: [],
            data: {
                id: updatedUser._id,
                email: updatedUser.email,
                name: updatedUser.name,
                bio: updatedUser.bio,
                countryCode: updatedUser.countryCode
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            errors: Object.values(err.errors),
            data: null
        });
    }
});
exports.default = {
    getProfile,
    updateProfile
};
