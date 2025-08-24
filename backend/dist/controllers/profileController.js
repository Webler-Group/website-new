"use strict";
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
const multer_1 = __importDefault(require("multer"));
const confg_1 = require("../confg");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const Post_1 = __importDefault(require("../models/Post"));
const fileUtils_1 = require("../utils/fileUtils");
const pushService_1 = require("../services/pushService");
const avatarImageUpload = (0, multer_1.default)({
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        // povolí image/png, image/jpg, image/jpeg, image/gif
        if (/^image\/(png|jpe?g|gif)$/i.test(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only .png, .jpg, .jpeg and .gif files are allowed"));
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
const getProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const roles = req.roles;
    const { userId } = req.body;
    const isModerator = roles && roles.some(role => ["Moderator", "Admin"].includes(role));
    const user = await User_1.default.findById(userId).lean();
    if (!user || (!user.active && !isModerator)) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    const isFollowing = currentUserId ?
        await UserFollowing_1.default.findOne({ user: currentUserId, following: userId }) !== null :
        false;
    const followers = await UserFollowing_1.default.countDocuments({ following: userId });
    const following = await UserFollowing_1.default.countDocuments({ user: userId });
    let codesQuery = Code_1.default
        .find({ user: userId });
    if (currentUserId !== userId) {
        codesQuery = codesQuery.where({ isPublic: true });
    }
    codesQuery = codesQuery
        .sort({ updatedAt: "desc" });
    const codes = await codesQuery
        .limit(5)
        .select("-source -cssSource -jsSource");
    const questions = await Post_1.default.find({ user: userId, _type: 1 })
        .sort({ createdAt: "desc" })
        .limit(5)
        .populate("tags", "name")
        .select("-message");
    const answers = await Post_1.default.find({ user: userId, _type: 2 })
        .sort({ createdAt: "desc" })
        .limit(5)
        .select("-message");
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
            notifications: user.notifications,
            codes: codes.map(x => ({
                id: x._id,
                name: x.name,
                createdAt: x.createdAt,
                updatedAt: x.updatedAt,
                comments: x.comments,
                votes: x.votes,
                isPublic: x.isPublic,
                language: x.language
            })),
            questions: questions.map(x => ({
                id: x._id,
                title: x.title,
                date: x.createdAt,
                answers: x.answers,
                votes: x.votes,
                tags: x.tags.map(x => x.name)
            })),
            answers: answers.map(x => ({
                id: x._id,
                title: x.title,
                date: x.createdAt,
                answers: x.answers,
                votes: x.votes
            }))
        }
    });
});
const updateProfile = (0, express_async_handler_1.default)(async (req, res) => {
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
    const user = await User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    user.name = name;
    user.bio = bio;
    user.countryCode = countryCode;
    try {
        const updatedUser = await user.save();
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
});
const changeEmail = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { email, password } = req.body;
    if (typeof email === "undefined" ||
        typeof password === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const user = await User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    const matchPassword = await user.matchPassword(password);
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
        await user.save();
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
});
const sendActivationCode = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const user = await User_1.default.findById(currentUserId);
    if (user === null) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    const { emailToken } = (0, tokenUtils_1.signEmailToken)({
        userId: currentUserId,
        email: user.email
    });
    try {
        await (0, email_1.sendActivationEmail)(user.name, user.email, user._id.toString(), emailToken);
        user.lastVerificationEmailTimestamp = Date.now();
        await user.save();
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ message: "Activation email could not be sent" });
    }
});
const changePassword = (0, express_async_handler_1.default)(async (req, res) => {
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
    const user = await User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    const matchPassword = await user.matchPassword(currentPassword);
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
        await user.save();
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
});
const follow = (0, express_async_handler_1.default)(async (req, res) => {
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
    const userExists = await User_1.default.findOne({ _id: userId });
    if (!userExists) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    const exists = await UserFollowing_1.default.findOne({ user: currentUserId, following: userId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }
    const userFollowing = await UserFollowing_1.default.create({
        user: currentUserId,
        following: userId
    });
    if (userFollowing) {
        const currentUserName = (await User_1.default.findById(currentUserId, "name")).name;
        await (0, pushService_1.sendToUsers)([userId], {
            title: "Follower",
            body: currentUserName + " followed you"
        }, "followers");
        await Notification_1.default.create({
            user: userId,
            actionUser: currentUserId,
            _type: 101,
            message: "{action_user} followed you"
        });
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
});
const unfollow = (0, express_async_handler_1.default)(async (req, res) => {
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
    const userFollowing = await UserFollowing_1.default.findOne({ user: currentUserId, following: userId });
    if (userFollowing === null) {
        res.status(204).json({ success: true });
        return;
    }
    const result = await UserFollowing_1.default.deleteOne({ user: currentUserId, following: userId });
    if (result.deletedCount == 1) {
        await Notification_1.default.deleteOne({
            user: userId,
            actionUser: currentUserId,
            _type: 101
        });
        res.json({ success: true });
        return;
    }
    res.status(500).json({ success: false });
});
const getFollowers = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId, page, count } = req.body;
    const currentUserId = req.userId;
    if (typeof page === "undefined" || typeof count === "undefined") {
        res.status(400).json({ message: "Some fileds are missing" });
        return;
    }
    const result = await UserFollowing_1.default.find({ following: userId })
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
        await Promise.all(promises);
        res.json({ success: true, data });
    }
    else {
        res.status(500).json({ success: false });
    }
});
const getFollowing = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId, page, count } = req.body;
    const currentUserId = req.userId;
    if (typeof page === "undefined" || typeof count === "undefined") {
        res.status(400).json({ message: "Some fileds are missing" });
        return;
    }
    const result = await UserFollowing_1.default.find({ user: userId })
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
        await Promise.all(promises);
        res.json({ success: true, data });
    }
    else {
        res.status(500).json({ success: false });
    }
});
const getNotifications = (0, express_async_handler_1.default)(async (req, res) => {
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
        const prevNotification = await Notification_1.default.findById(fromId);
        if (prevNotification !== null) {
            dbQuery = dbQuery
                .where({ createdAt: { $lt: prevNotification.createdAt } });
        }
    }
    const result = await dbQuery
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
});
const getUnseenNotificationCount = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const count = await Notification_1.default.countDocuments({ user: currentUserId, isClicked: false, hidden: false });
    res.json({ count });
});
const markNotificationsSeen = (0, express_async_handler_1.default)(async (req, res) => {
    const { fromId } = req.body;
    if (typeof fromId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    // TODO
    res.json({});
});
const markNotificationsClicked = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { ids } = req.body;
    if (typeof ids !== "undefined") {
        await Notification_1.default.updateMany({ _id: { $in: ids } }, { $set: { isClicked: true } });
    }
    else {
        await Notification_1.default.updateMany({ user: currentUserId, isClicked: false, hidden: false }, { $set: { isClicked: true } });
    }
    res.json({});
});
const toggleUserBan = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId, active } = req.body;
    const user = await User_1.default.findById(userId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    if (user.roles.some(role => ["Admin", "Moderator"].includes(role))) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    user.active = active;
    try {
        await user.save();
        res.json({ success: true, active });
    }
    catch (err) {
        res.json({
            success: false,
            error: err
        });
    }
});
const uploadProfileAvatarImage = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    if (!req.file) {
        res.status(400).json({
            success: false,
            message: "No file uploaded"
        });
        return;
    }
    const user = await User_1.default.findById(currentUserId);
    if (!user) {
        fs_1.default.unlinkSync(req.file.path);
        res.status(404).json({ message: "User not found" });
        return;
    }
    try {
        const compressedBuffer = await (0, fileUtils_1.compressAvatar)({
            inputPath: req.file.path,
        });
        // Overwrite original file
        fs_1.default.writeFileSync(req.file.path, new Uint8Array(compressedBuffer));
        if (user.avatarImage) {
            const oldPath = path_1.default.join(confg_1.config.rootDir, "uploads", "users", user.avatarImage);
            if (fs_1.default.existsSync(oldPath)) {
                fs_1.default.unlinkSync(oldPath);
            }
        }
        user.avatarImage = req.file.filename;
        await user.save();
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
});
const updateNotifications = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { notifications } = req.body;
    if (!notifications || typeof notifications !== "object") {
        res.status(400).json({ message: "Invalid notifications object" });
        return;
    }
    const user = await User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return;
    }
    if (!user.notifications) {
        user.notifications = {
            followers: true,
            codes: true,
            discuss: true,
            channels: true
        };
    }
    if (typeof notifications.followers !== "undefined") {
        user.notifications.followers = notifications.followers;
    }
    if (typeof notifications.codes !== "undefined") {
        user.notifications.codes = notifications.codes;
    }
    if (typeof notifications.discuss !== "undefined") {
        user.notifications.discuss = notifications.discuss;
    }
    if (typeof notifications.channels !== "undefined") {
        user.notifications.channels = notifications.channels;
    }
    try {
        await user.save();
        res.json({
            success: true,
            data: {
                notifications: user.notifications
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
});
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
    avatarImageUpload,
    updateNotifications
};
exports.default = controller;
