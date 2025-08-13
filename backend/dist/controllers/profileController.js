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
const tokenUtils_1 = require("../utils/tokenUtils");
const email_1 = require("../services/email");
const date_fns_1 = require("date-fns");
const multer_1 = __importDefault(require("multer"));
const confg_1 = require("../confg");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const avatarImageUpload = (0, multer_1.default)({
    limits: { fileSize: 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    },
    storage: multer_1.default.diskStorage({
        destination(req, file, cb) {
            const dir = path_1.default.join(confg_1.config.rootDir, "uploads", "users");
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename(req, file, cb) {
            cb(null, (0, uuid_1.v4)() + path_1.default.extname(file.originalname));
        }
    })
});
const getProfile = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const roles = req.roles;
    const { userId } = req.body;
    const isModerator = roles && roles.includes("Moderator");
    const user = yield User_1.default.findById(userId);
    if (!user || (!user.active && !isModerator)) {
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
        .sort({ updatedAt: "desc" });
    const codes = yield codesQuery
        .limit(10)
        .select("-source -cssSource -jsSource");
    res.json({
        userDetails: {
            id: user._id,
            name: user.name,
            email: currentUserId === userId ? user.email : null,
            bio: user.bio,
            avatarImage: user.avatarImage,
            roles: user.roles,
            emailVerified: user.emailVerified,
            countryCode: user.countryCode,
            followers,
            following,
            isFollowing,
            registerDate: user.createdAt,
            level: user.level,
            xp: user.xp,
            active: user.active,
            codes: codes.map(x => ({
                id: x._id,
                name: x.name,
                createdAt: x.createdAt,
                updatedAt: x.updatedAt,
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
        user.emailVerified = false;
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
const sendActivationCode = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    const user = yield User_1.default.findById(currentUserId);
    if (user === null) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const diff = Date.now() - user.lastVerificationEmailTimestamp;
    const minDiff = 60 * 60 * 1000;
    if (confg_1.config.nodeEnv === "production" && diff < minDiff) {
        const duration = (0, date_fns_1.intervalToDuration)({ start: Date.now(), end: user.lastVerificationEmailTimestamp + minDiff });
        res.status(400).json({ message: `You can send verification email in ${duration.hours} hours and ${duration.minutes} minutes` });
        return;
    }
    const { emailToken } = (0, tokenUtils_1.signEmailToken)({
        userId: currentUserId,
        email: user.email
    });
    try {
        yield (0, email_1.sendActivationEmail)(user.name, user.email, user._id.toString(), emailToken);
        user.lastVerificationEmailTimestamp = Date.now();
        yield user.save();
        res.json({ success: true });
    }
    catch (_a) {
        res.status(500).json({ message: "Email could not be sent" });
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
        .populate("user", "name avatarImage countryCode level roles")
        .select("user");
    if (result) {
        const promises = [];
        const data = result.map(x => ({
            id: x.user._id,
            name: x.user.name,
            avatar: x.user.avatarImage,
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
        .populate("following", "name avatarImage countryCode level roles")
        .select("following");
    if (result) {
        const promises = [];
        const data = result.map(x => ({
            id: x.following._id,
            name: x.following.name,
            avatar: x.following.avatarImage,
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
        .find({ user: currentUserId, hidden: false })
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
        .populate("actionUser", "name avatarImage countryCode level roles")
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
                avatar: x.user.avatarImage,
                level: x.user.level,
                roles: x.user.roles
            },
            actionUser: {
                id: x.actionUser._id,
                name: x.actionUser.name,
                countryCode: x.actionUser.countryCode,
                avatar: x.actionUser.avatarImage,
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
    const count = yield Notification_1.default.countDocuments({ user: currentUserId, isClicked: false, hidden: false });
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
        yield Notification_1.default.updateMany({ user: currentUserId, isClicked: false, hidden: false }, { $set: { isClicked: true } });
    }
    res.json({});
}));
const toggleUserBan = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const roles = req.roles;
    const { userId, active } = req.body;
    if (!roles || !roles.includes("Moderator")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const user = yield User_1.default.findById(userId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    if (user.roles.includes("Moderator") || user.roles.includes("Admin")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    user.active = active;
    try {
        yield user.save();
        res.json({ success: true, active });
    }
    catch (err) {
        res.json({
            success: false,
            error: err
        });
    }
}));
const uploadProfileAvatarImage = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = req.userId;
    if (!req.file) {
        res.status(400).json({
            success: false,
            message: "No file uploaded"
        });
        return;
    }
    const user = yield User_1.default.findById(currentUserId);
    if (!user) {
        fs_1.default.unlinkSync(req.file.path);
        res.status(404).json({ message: "User not found" });
        return;
    }
    if (user.avatarImage) {
        const oldPath = path_1.default.join(confg_1.config.rootDir, "uploads", "users", user.avatarImage);
        if (fs_1.default.existsSync(oldPath)) {
            fs_1.default.unlinkSync(oldPath);
        }
    }
    user.avatarImage = req.file.filename;
    try {
        yield user.save();
        res.json({
            success: true,
            data: {
                avatarImage: user.avatarImage
            }
        });
    }
    catch (err) {
        res.json({
            success: false,
            error: err
        });
    }
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
    markNotificationsClicked,
    sendActivationCode,
    toggleUserBan,
    uploadProfileAvatarImage,
    avatarImageUpload
};
exports.default = controller;
