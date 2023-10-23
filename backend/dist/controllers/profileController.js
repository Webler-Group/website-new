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
const Notification_1 = __importDefault(require("../models/Notification"));
const Code_1 = __importDefault(require("../models/Code"));
const getProfile = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { userId } = req.body;
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
    let codesQuery = Code_1.default
        .find({ user: userId });
    if (currentUserId !== userId) {
        codesQuery = codesQuery.where({ isPublic: true });
    }
    codesQuery = codesQuery
        .sort({ createdAt: "desc" });
    const codes = yield codesQuery
        .limit(10)
        .select("-source -cssSource -jsSource");
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
            xp: user.xp,
            codes: codes.map(x => ({
                id: x._id,
                name: x.name,
                date: x.createdAt,
                comments: x.comments,
                votes: x.votes,
                isPublic: x.isPublic,
                language: x.language
            }))
        }
    });
}));
const updateProfile = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { userId, name, bio, countryCode } = req.body;
    if (typeof name === "undefined" ||
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
    user.name = name;
    user.bio = bio;
    user.countryCode = countryCode;
    try {
        const updatedUser = yield user.save();
        res.json({
            success: true,
            data: {
                id: updatedUser._id,
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
const changeEmail = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { email, password } = req.body;
    if (typeof email === "undefined" ||
        typeof password === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const user = yield User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    const matchPassword = yield user.matchPassword(password);
    if (!matchPassword) {
        res.json({
            success: false,
            error: { _message: "Incorrect information" },
            data: null
        });
        return;
    }
    try {
        user.email = email;
        yield user.save();
        res.json({
            success: true,
            data: {
                id: user._id,
                email: user.email
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
    const { userId } = req.body;
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
        yield Notification_1.default.create({
            user: userId,
            actionUser: currentUserId,
            _type: 101,
            message: "{action_user} followed you"
        });
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
}));
const unfollow = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { userId } = req.body;
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
        yield Notification_1.default.deleteOne({
            user: userId,
            actionUser: currentUserId,
            _type: 101
        });
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
}));
const getFollowers = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, page, count } = req.body;
    const currentUserId = req.userId;
    if (typeof page === "undefined" || typeof count === "undefined") {
        res.status(400).json({ message: "Some fileds are missing" });
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
    const { userId, page, count } = req.body;
    const currentUserId = req.userId;
    if (typeof page === "undefined" || typeof count === "undefined") {
        res.status(400).json({ message: "Some fileds are missing" });
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
const getNotifications = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { count, fromId } = req.body;
    if (typeof count === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    let dbQuery = Notification_1.default
        .find({ user: currentUserId })
        .sort({ createdAt: "desc" });
    if (typeof fromId !== "undefined") {
        const prevNotification = yield Notification_1.default.findById(fromId);
        if (prevNotification !== null) {
            dbQuery = dbQuery
                .where({ createdAt: { $lt: prevNotification.createdAt } });
        }
    }
    const result = yield dbQuery
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("actionUser", "name avatarUrl countryCode level roles")
        .populate("postId", "parentId");
    if (result) {
        const data = result.map(x => ({
            id: x._id,
            type: x._type,
            message: x.message,
            date: x.createdAt,
            user: {
                id: x.user._id,
                name: x.user.name,
                countryCode: x.user.countryCode,
                level: x.user.level,
                roles: x.user.roles
            },
            actionUser: {
                id: x.actionUser._id,
                name: x.actionUser.name,
                countryCode: x.actionUser.countryCode,
                level: x.actionUser.level,
                roles: x.actionUser.roles
            },
            isSeen: x.isSeen,
            isClicked: x.isClicked,
            codeId: x.codeId,
            postId: x.postId ? x.postId._id : null,
            post: {
                parentId: x.postId ? x.postId.parentId : null
            },
            questionId: x.questionId
        }));
        res.json({
            notifications: data
        });
    }
    else {
        res.status(500).json({ message: "error" });
    }
}));
const getUnseenNotificationCount = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const count = yield Notification_1.default.countDocuments({ user: currentUserId, isClicked: false });
    res.json({ count });
}));
const markNotificationsSeen = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fromId } = req.body;
    if (typeof fromId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    // TODO
    res.json({});
}));
const markNotificationsClicked = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const { ids } = req.body;
    if (typeof ids !== "undefined") {
        yield Notification_1.default.updateMany({ _id: { $in: ids } }, { $set: { isClicked: true } });
    }
    else {
        yield Notification_1.default.updateMany({ user: currentUserId, isClicked: false }, { $set: { isClicked: true } });
    }
    res.json({});
}));
const controller = {
    getProfile,
    updateProfile,
    changeEmail,
    changePassword,
    follow,
    unfollow,
    getFollowers,
    getFollowing,
    getNotifications,
    getUnseenNotificationCount,
    markNotificationsSeen,
    markNotificationsClicked
};
exports.default = controller;
