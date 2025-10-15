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
const regexUtils_1 = require("../utils/regexUtils");
const EmailChangeRecord_1 = __importDefault(require("../models/EmailChangeRecord"));
const mongoose_1 = __importDefault(require("mongoose"));
const RolesEnum_1 = __importDefault(require("../data/RolesEnum"));
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const PostTypeEnum_1 = __importDefault(require("../data/PostTypeEnum"));
const zodUtils_1 = require("../utils/zodUtils");
const profileSchema_1 = require("../validation/profileSchema");
const MulterFileTypeError_1 = __importDefault(require("../exceptions/MulterFileTypeError"));
const avatarImageUpload = (0, multer_1.default)({
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
        if (/^image\/(png|jpe?g)$/i.test(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new MulterFileTypeError_1.default("Only .png, .jpg and .jpeg files are allowed"));
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
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.getProfileSchema, req);
    const { userId } = body;
    const isModerator = roles && roles.some(role => [RolesEnum_1.default.MODERATOR, RolesEnum_1.default.ADMIN].includes(role));
    const user = await User_1.default.findById(userId).lean();
    if (!user || (!user.active && !isModerator)) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }
    const isFollowing = currentUserId ?
        await UserFollowing_1.default.findOne({ user: currentUserId, following: userId }) !== null :
        false;
    const followers = await UserFollowing_1.default.countDocuments({ following: userId });
    const following = await UserFollowing_1.default.countDocuments({ user: userId });
    let codesQuery = Code_1.default
        .find({
        user: userId,
        $or: [
            { challenge: null },
            { challenge: { $exists: false } }
        ]
    })
        .sort({ updatedAt: "desc" });
    if (currentUserId !== userId) {
        codesQuery = codesQuery.where({ isPublic: true });
    }
    codesQuery = codesQuery
        .sort({ updatedAt: "desc" });
    const codes = await codesQuery
        .limit(5)
        .select("-source -cssSource -jsSource");
    const questions = await Post_1.default.find({ user: userId, _type: PostTypeEnum_1.default.QUESTION })
        .sort({ createdAt: "desc" })
        .limit(5)
        .populate("tags", "name")
        .select("-message");
    const answers = await Post_1.default.find({ user: userId, _type: PostTypeEnum_1.default.ANSWER })
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
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.updateProfileSchema, req);
    const { userId, name, bio, countryCode } = body;
    if (currentUserId !== userId && !req.roles?.includes(RolesEnum_1.default.ADMIN)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    const user = await User_1.default.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }
    if (user.name != name && await User_1.default.exists({ name })) {
        res.status(404).json({ error: [{ message: "Username is already taken" }] });
        return;
    }
    user.name = name;
    user.bio = bio;
    user.countryCode = countryCode;
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
});
const changeEmail = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.changeEmailSchema, req);
    const { email, password } = body;
    const user = await User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }
    const matchPassword = await user.matchPassword(password);
    if (!matchPassword) {
        res.status(403).json({ error: [{ message: "Incorrect information" }] });
        return;
    }
    if (user.email == email) {
        res.json({ error: [{ message: "Emails cannot be same" }] });
        return;
    }
    const code = await EmailChangeRecord_1.default.generate(new mongoose_1.default.Types.ObjectId(currentUserId), email);
    if (!code) {
        res.status(401).json({ error: [{ message: "Email is already used" }] });
        return;
    }
    await (0, email_1.sendEmailChangeVerification)(user.name, user.email, email, code);
    res.json({
        success: true
    });
});
const verifyEmailChange = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.verifyEmailChangeSchema, req);
    const { code } = body;
    const record = await EmailChangeRecord_1.default.findOne({ userId: currentUserId, code }).lean();
    if (!record) {
        res.status(400).json({ error: [{ message: "Invalid or expired code" }] });
        return;
    }
    await EmailChangeRecord_1.default.deleteOne({ _id: record._id });
    // Check expiration (15 minutes = 900000 ms)
    const now = Date.now();
    if (now - record.createdAt.getTime() > 15 * 60 * 1000) {
        res.status(403).json({ error: [{ message: "Code has expired" }] });
        return;
    }
    const user = await User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    if (await User_1.default.exists({ email: record.newEmail })) {
        res.status(401).json({ error: [{ message: "Email is already taken" }] });
        return;
    }
    user.email = record.newEmail;
    user.emailVerified = confg_1.config.nodeEnv == "development";
    await user.save();
    res.json({ success: true, data: { email: user.email } });
});
const sendActivationCode = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const user = await User_1.default.findById(currentUserId);
    if (user === null) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }
    const { emailToken } = (0, tokenUtils_1.signEmailToken)({
        userId: currentUserId,
        email: user.email,
        action: "verify-email"
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
const follow = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.followSchema, req);
    const { userId } = body;
    if (userId === currentUserId) {
        res.status(400).json({ error: [{ message: "Fields 'user' and 'following' cannot be same" }] });
        return;
    }
    const userExists = await User_1.default.exists({ _id: userId });
    if (!userExists) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }
    const exists = await UserFollowing_1.default.exists({ user: currentUserId, following: userId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }
    await UserFollowing_1.default.create({
        user: currentUserId,
        following: userId
    });
    await Notification_1.default.sendToUsers([userId], {
        title: "New follower",
        actionUser: currentUserId,
        type: NotificationTypeEnum_1.default.PROFILE_FOLLOW,
        message: "{action_user} followed you"
    });
    res.json({ success: true });
});
const unfollow = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.unfollowSchema, req);
    const { userId } = body;
    if (userId === currentUserId) {
        res.status(400).json({ error: [{ message: "Fields 'user' and 'following' cannot be same" }] });
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
            _type: NotificationTypeEnum_1.default.PROFILE_FOLLOW
        });
    }
    res.json({ success: true });
});
const getFollowers = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.getFollowersSchema, req);
    const { userId, page, count } = body;
    const currentUserId = req.userId;
    const result = await UserFollowing_1.default.find({ following: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles")
        .select("user");
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
});
const getFollowing = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.getFollowingSchema, req);
    const { userId, page, count } = body;
    const currentUserId = req.userId;
    const result = await UserFollowing_1.default.find({ user: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("following", "name avatarImage countryCode level roles")
        .select("following");
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
});
const getNotifications = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.getNotificationsSchema, req);
    const { count, fromId } = body;
    const currentUserId = req.userId;
    let dbQuery = Notification_1.default
        .find({ user: currentUserId, hidden: false })
        .sort({ createdAt: "desc" });
    if (fromId) {
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
        courseCode: x.courseCode,
        lessonId: x.lessonId,
        postId: x.postId ? x.postId._id : null,
        post: {
            parentId: x.postId ? x.postId.parentId : null
        },
        questionId: x.questionId,
        feedId: x.feedId
    }));
    res.json({
        notifications: data
    });
});
const getUnseenNotificationCount = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const count = await Notification_1.default.countDocuments({ user: currentUserId, isClicked: false, hidden: false });
    res.json({ count });
});
const markNotificationsClicked = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.markNotificationsClickedSchema, req);
    const { ids } = body;
    if (ids) {
        await Notification_1.default.updateMany({ _id: { $in: ids } }, { $set: { isClicked: true } });
    }
    else {
        await Notification_1.default.updateMany({ user: currentUserId, isClicked: false, hidden: false }, { $set: { isClicked: true } });
    }
    res.json({});
});
const uploadProfileAvatarImage = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.uploadProfileAvatarImageSchema, req);
    const { userId } = body;
    const currentUserId = req.userId;
    if (!req.file) {
        res.status(400).json({ error: [{ message: "No file uploaded" }] });
        return;
    }
    const user = await User_1.default.findById(userId);
    if (!user) {
        fs_1.default.unlinkSync(req.file.path);
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }
    if (currentUserId !== userId && !req.roles?.includes(RolesEnum_1.default.ADMIN)) {
        fs_1.default.unlinkSync(req.file.path);
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
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
});
const removeProfileAvatarImage = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.removeProfileImageSchema, req);
    const { userId } = body;
    const currentUserId = req.userId;
    const user = await User_1.default.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }
    if (currentUserId !== userId && !req.roles?.includes(RolesEnum_1.default.ADMIN)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    if (user.avatarImage) {
        const oldPath = path_1.default.join(confg_1.config.rootDir, "uploads", "users", user.avatarImage);
        if (fs_1.default.existsSync(oldPath)) {
            fs_1.default.unlinkSync(oldPath);
        }
        user.avatarImage = null;
        await user.save();
    }
    res.json({
        success: true
    });
});
const updateNotifications = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.updateNotificationsSchema, req);
    const { notifications } = body;
    const user = await User_1.default.findById(currentUserId);
    if (!user) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }
    if (user.notifications) {
        for (let entry of notifications) {
            user.notifications[entry.type] = entry.enabled;
        }
    }
    await user.save();
    res.json({
        success: true,
        data: {
            notifications: user.notifications
        }
    });
});
const searchProfiles = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(profileSchema_1.searchProfilesSchema, req);
    const { searchQuery } = body;
    const match = { active: true, roles: RolesEnum_1.default.USER };
    if (searchQuery && searchQuery.trim() !== "") {
        const safeQuery = (0, regexUtils_1.escapeRegex)(searchQuery.trim());
        const searchRegex = new RegExp(`^${safeQuery}`, "i");
        match.name = searchRegex;
    }
    const users = await User_1.default.find()
        .where(match)
        .select("name avatarImage level roles countryCode");
    res.json({
        users: users.map(u => ({
            id: u._id,
            name: u.name,
            avatar: u.avatarImage,
            level: u.level,
            roles: u.roles,
            countryCode: u.countryCode
        }))
    });
});
const controller = {
    getProfile,
    updateProfile,
    changeEmail,
    follow,
    unfollow,
    getFollowers,
    getFollowing,
    getNotifications,
    getUnseenNotificationCount,
    markNotificationsClicked,
    sendActivationCode,
    uploadProfileAvatarImage,
    removeProfileAvatarImage,
    avatarImageUpload,
    updateNotifications,
    searchProfiles,
    verifyEmailChange
};
exports.default = controller;
