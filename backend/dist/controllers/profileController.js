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
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const UserFollowing_1 = __importDefault(require("../models/UserFollowing"));
const getProfile = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const userId = req.params.userId;
    const user = yield User_1.default.findById(userId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    const isFollowing = currentUserId ?
        (yield UserFollowing_1.default.findOne({ user: currentUserId, following: userId })) !== null :
        false;
    const followers = yield UserFollowing_1.default.countDocuments({ following: userId });
    const following = yield UserFollowing_1.default.countDocuments({ user: userId });
    res.json({
        userDetails: {
            id: user._id,
            name: user.name,
            email: currentUserId === userId ? user.email : null,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            roles: user.roles,
            emailVerified: user.emailVerified,
            countryCode: user.countryCode,
            followers,
            following,
            isFollowing,
            registerDate: user.createdAt,
            level: user.level,
            xp: user.xp
        }
    });
}));
const updateProfile = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const userId = req.params.userId;
    const { email, name, bio, countryCode } = req.body;
    if (typeof name === "undefined" ||
        typeof email === "undefined" ||
        typeof bio === "undefined" ||
        typeof countryCode === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    if (currentUserId !== userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const user = yield User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    user.email = email;
    user.name = name;
    user.bio = bio;
    user.countryCode = countryCode;
    try {
        const updatedUser = yield user.save();
        res.json({
            success: true,
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
            error: err,
            data: null
        });
    }
}));
const changePassword = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword === "undefined" ||
        typeof newPassword === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    if (currentPassword === newPassword) {
        res.status(400).json({ message: "Passwords cannot be same" });
        return;
    }
    const user = yield User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    const matchPassword = yield user.matchPassword(currentPassword);
    if (!matchPassword) {
        res.json({
            success: false,
            error: { _message: "Incorrect information" },
            data: false
        });
        return;
    }
    try {
        user.password = newPassword;
        yield user.save();
        res.json({
            success: true,
            data: true
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err,
            data: false
        });
    }
}));
const follow = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const userId = req.params.userId;
    if (typeof userId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    if (userId === currentUserId) {
        res.status(400).json({ message: "Fields 'user' and 'following' cannot be same" });
        return;
    }
    const userExists = yield User_1.default.findOne({ _id: userId });
    if (!userExists) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    const exists = yield UserFollowing_1.default.findOne({ user: currentUserId, following: userId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }
    const userFollowing = yield UserFollowing_1.default.create({
        user: currentUserId,
        following: userId
    });
    if (userFollowing) {
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
}));
const unfollow = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const userId = req.params.userId;
    if (typeof userId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    if (userId === currentUserId) {
        res.status(400).json({ message: "Fields 'user' and 'following' cannot be same" });
        return;
    }
    const userFollowing = yield UserFollowing_1.default.findOne({ user: currentUserId, following: userId });
    if (userFollowing === null) {
        res.status(204).json({ success: true });
        return;
    }
    const result = yield UserFollowing_1.default.deleteOne({ user: currentUserId, following: userId });
    if (result.deletedCount == 1) {
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
}));
const getFollowers = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    const query = req.query;
    const currentUserId = req.userId;
    const page = Number(query.page);
    const count = Number(query.count);
    if (!Number.isInteger(page) || !Number.isInteger(count)) {
        res.status(400).json({ message: "Invalid query params" });
        return;
    }
    const result = yield UserFollowing_1.default.find({ following: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles")
        .select("user");
    if (result) {
        const promises = [];
        const data = result.map(x => ({
            id: x.user._id,
            name: x.user.name,
            avatarUrl: x.user.avatarUrl,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles,
            isFollowing: false
        }));
        for (let i = 0; i < data.length; ++i) {
            const user = data[i];
            promises.push(UserFollowing_1.default.findOne({ user: currentUserId, following: user.id })
                .then(exists => {
                data[i].isFollowing = exists !== null;
            }));
        }
        yield Promise.all(promises);
        res.json({ success: true, data });
    }
    else {
        res.status(500).json({ success: false });
    }
}));
const getFollowing = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    const query = req.query;
    const currentUserId = req.userId;
    const page = Number(query.page);
    const count = Number(query.count);
    if (!Number.isInteger(page) || !Number.isInteger(count)) {
        res.status(400).json({ message: "Invalid query params" });
        return;
    }
    const result = yield UserFollowing_1.default.find({ user: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("following", "name avatarUrl countryCode level roles")
        .select("following");
    if (result) {
        const promises = [];
        const data = result.map(x => ({
            id: x.following._id,
            name: x.following.name,
            avatarUrl: x.following.avatarUrl,
            countryCode: x.following.countryCode,
            level: x.following.level,
            roles: x.following.roles,
            isFollowing: false
        }));
        for (let i = 0; i < data.length; ++i) {
            const user = data[i];
            promises.push(UserFollowing_1.default.findOne({ user: currentUserId, following: user.id })
                .then(exists => {
                data[i].isFollowing = exists !== null;
            }));
        }
        yield Promise.all(promises);
        res.json({ success: true, data });
    }
    else {
        res.status(500).json({ success: false });
    }
}));
const controller = {
    getProfile,
    updateProfile,
    changePassword,
    follow,
    unfollow,
    getFollowers,
    getFollowing
};
exports.default = controller;
