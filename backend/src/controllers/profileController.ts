import { IAuthRequest } from "../middleware/verifyJWT";
import User from "../models/User";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import UserFollowing from "../models/UserFollowing";
import Notification from "../models/Notification";
import Code from "../models/Code";
import { signEmailToken } from "../utils/tokenUtils";
import { sendActivationEmail, sendEmailChangeVerification } from "../services/email";
import multer from "multer";
import { config } from "../confg";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import Post from "../models/Post";
import { compressAvatar } from "../utils/fileUtils";
import { escapeRegex } from "../utils/regexUtils";
import EmailChangeRecord from "../models/EmailChangeRecord";
import mongoose from "mongoose";
import RolesEnum from "../data/RolesEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import PostTypeEnum from "../data/PostTypeEnum";
import { parseWithZod } from "../utils/zodUtils";
import { changeEmailSchema, followSchema, getFollowersSchema, getFollowingSchema, getNotificationsSchema, getProfileSchema, markNotificationsClickedSchema, removeProfileImageSchema, searchProfilesSchema, unfollowSchema, updateNotificationsSchema, updateProfileSchema, uploadProfileAvatarImageSchema, verifyEmailChangeSchema } from "../validation/profileSchema";
import MulterFileTypeError from "../exceptions/MulterFileTypeError";

const avatarImageUpload = multer({
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
        if (/^image\/(png|jpe?g)$/i.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new MulterFileTypeError("Only .png, .jpg and .jpeg files are allowed"));
        }
    },
    storage: multer.diskStorage({
        destination(req, file, cb) {
            const dir = path.join(config.rootDir, "uploads", "users");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename(req, file, cb) {
            cb(null, uuid() + path.extname(file.originalname));
        }
    })
});

const getProfile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const roles = req.roles;
    const { body } = parseWithZod(getProfileSchema, req);
    const { userId } = body;

    const isModerator = roles && roles.some(role => [RolesEnum.MODERATOR, RolesEnum.ADMIN].includes(role));

    const user = await User.findById(userId).lean();
    if (!user || (!user.active && !isModerator)) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return
    }

    const isFollowing = currentUserId ?
        await UserFollowing.findOne({ user: currentUserId, following: userId }) !== null :
        false;

    const followers = await UserFollowing.countDocuments({ following: userId });
    const following = await UserFollowing.countDocuments({ user: userId });

    let codesQuery = Code
        .find({
            user: userId,
            $or: [
                { challenge: null },
                { challenge: { $exists: false } }
            ]
        })
        .sort({ updatedAt: "desc" });

    if (currentUserId !== userId) {
        codesQuery = codesQuery.where({ isPublic: true })
    }

    codesQuery = codesQuery
        .sort({ updatedAt: "desc" })

    const codes = await codesQuery
        .limit(5)
        .select("-source -cssSource -jsSource");

    const questions = await Post.find({ user: userId, _type: PostTypeEnum.QUESTION })
        .sort({ createdAt: "desc" })
        .limit(5)
        .populate<{ tags: any[] }>("tags", "name")
        .select("-message");

    const answers = await Post.find({ user: userId, _type: PostTypeEnum.ANSWER })
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
            levelTag: user.levelTag,
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

})

const updateProfile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(updateProfileSchema, req);
    const { userId, name, bio, countryCode } = body;

    if (currentUserId !== userId && !req.roles?.includes(RolesEnum.ADMIN)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const user = await User.findById(userId);

    if (!user) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }

    if (user.name != name && await User.exists({ name })) {
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

const changeEmail = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(changeEmailSchema, req);
    const { email, password } = body;

    const user = await User.findById(currentUserId);

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

    const code = await EmailChangeRecord.generate(new mongoose.Types.ObjectId(currentUserId), email);
    if (!code) {
        res.status(401).json({ error: [{ message: "Email is already used" }] });
        return;
    }
    await sendEmailChangeVerification(user.name, user.email, email, code);

    res.json({
        success: true
    });

});

const verifyEmailChange = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(verifyEmailChangeSchema, req);
    const { code } = body;

    const record = await EmailChangeRecord.findOne({ userId: currentUserId, code }).lean();

    if (!record) {
        res.status(400).json({ error: [{ message: "Invalid or expired code" }] });
        return;
    }

    await EmailChangeRecord.deleteOne({ _id: record._id });

    // Check expiration (15 minutes = 900000 ms)
    const now = Date.now();
    if (now - record.createdAt.getTime() > 15 * 60 * 1000) {
        res.status(403).json({ error: [{ message: "Code has expired" }] });
        return;
    }

    const user = await User.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    if (await User.exists({ email: record.newEmail })) {
        res.status(401).json({ error: [{ message: "Email is already taken" }] });
        return;
    }

    user.email = record.newEmail;
    user.emailVerified = config.nodeEnv == "development";
    await user.save();

    res.json({ success: true, data: { email: user.email } });
});


const sendActivationCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const user = await User.findById(currentUserId);
    if (user === null) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    const { emailToken } = signEmailToken({
        userId: currentUserId as string,
        email: user.email,
        action: "verify-email"
    });

    try {
        await sendActivationEmail(user.name, user.email, user._id.toString(), emailToken);

        user.lastVerificationEmailTimestamp = Date.now();
        await user.save();

        res.json({ success: true });
    }
    catch {
        res.status(500).json({ message: "Activation email could not be sent" });
    }
})

const follow = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(followSchema, req);
    const { userId } = body;

    if (userId === currentUserId) {
        res.status(400).json({ error: [{ message: "Fields 'user' and 'following' cannot be same" }] });
        return;
    }

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }

    const exists = await UserFollowing.exists({ user: currentUserId, following: userId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }

    await UserFollowing.create({
        user: currentUserId,
        following: userId
    });

    await Notification.sendToUsers([userId], {
        title: "New follower",
        actionUser: currentUserId!,
        type: NotificationTypeEnum.PROFILE_FOLLOW,
        message: "{action_user} followed you"
    });

    res.json({ success: true });
});

const unfollow = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(unfollowSchema, req);
    const { userId } = body;

    if (userId === currentUserId) {
        res.status(400).json({ error: [{ message: "Fields 'user' and 'following' cannot be same" }] });
        return;
    }

    const userFollowing = await UserFollowing.findOne({ user: currentUserId, following: userId });
    if (userFollowing === null) {
        res.status(204).json({ success: true });
        return;
    }

    const result = await UserFollowing.deleteOne({ user: currentUserId, following: userId })
    if (result.deletedCount == 1) {

        await Notification.deleteOne({
            user: userId,
            actionUser: currentUserId,
            _type: NotificationTypeEnum.PROFILE_FOLLOW
        })
    }

    res.json({ success: true });
});

const getFollowers = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getFollowersSchema, req);
    const { userId, page, count } = body;
    const currentUserId = req.userId;

    const result = await UserFollowing.find({ following: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles")
        .select("user") as any[];

    const promises: Promise<void>[] = [];
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
        promises.push(UserFollowing.findOne({ user: currentUserId, following: user.id })
            .then(exists => {
                data[i].isFollowing = exists !== null;
            }));
    }

    await Promise.all(promises);

    res.json({ success: true, data })
});

const getFollowing = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getFollowingSchema, req);
    const { userId, page, count } = body;
    const currentUserId = req.userId;

    const result = await UserFollowing.find({ user: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("following", "name avatarImage countryCode level roles")
        .select("following") as any[];

    const promises: Promise<void>[] = [];
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
        promises.push(UserFollowing.findOne({ user: currentUserId, following: user.id })
            .then(exists => {
                data[i].isFollowing = exists !== null;
            }));
    }

    await Promise.all(promises);

    res.json({ success: true, data })
});

const getNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getNotificationsSchema, req);
    const { count, fromId } = body;
    const currentUserId = req.userId;

    let dbQuery = Notification
        .find({ user: currentUserId, hidden: false })
        .sort({ createdAt: "desc" });

    if (fromId) {
        const prevNotification = await Notification.findById(fromId);

        if (prevNotification !== null) {
            dbQuery = dbQuery
                .where({ createdAt: { $lt: prevNotification.createdAt } });
        }
    }

    const result = await dbQuery
        .limit(count)
        .populate<{ user: any }>("user", "name avatarUrl countryCode level roles")
        .populate<{ actionUser: any }>("actionUser", "name avatarImage countryCode level roles")
        .populate<{ postId: any }>("postId", "parentId");

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
})

const getUnseenNotificationCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const count = await Notification.countDocuments({ user: currentUserId, isClicked: false, hidden: false })

    res.json({ count });
});

const markNotificationsClicked = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(markNotificationsClickedSchema, req);
    const { ids } = body;

    if (ids) {
        await Notification.updateMany({ _id: { $in: ids } }, { $set: { isClicked: true } })
    }
    else {
        await Notification.updateMany({ user: currentUserId, isClicked: false, hidden: false }, { $set: { isClicked: true } })
    }

    res.json({});
});

const uploadProfileAvatarImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(uploadProfileAvatarImageSchema, req);
    const { userId } = body;
    const currentUserId = req.userId;

    if (!req.file) {
        res.status(400).json({ error: [{ message: "No file uploaded" }] });
        return;
    }

    const user = await User.findById(userId);
    if (!user) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    if (currentUserId !== userId && !req.roles?.includes(RolesEnum.ADMIN)) {
        fs.unlinkSync(req.file.path);
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const compressedBuffer = await compressAvatar({
        inputPath: req.file.path,
    });

    // Overwrite original file
    fs.writeFileSync(req.file.path, new Uint8Array(compressedBuffer));

    if (user.avatarImage) {
        const oldPath = path.join(config.rootDir, "uploads", "users", user.avatarImage);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
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

const removeProfileAvatarImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(removeProfileImageSchema, req);
    const { userId } = body;
    const currentUserId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    if (currentUserId !== userId && !req.roles?.includes(RolesEnum.ADMIN)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    if (user.avatarImage) {
        const oldPath = path.join(config.rootDir, "uploads", "users", user.avatarImage);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }

        user.avatarImage = null as any;
        await user.save();
    }

    res.json({
        success: true
    });
});

const updateNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(updateNotificationsSchema, req);
    const { notifications } = body;

    const user = await User.findById(currentUserId);
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

const searchProfiles = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(searchProfilesSchema, req);
    const { searchQuery } = body;

    const match: any = { active: true, roles: RolesEnum.USER };

    if (searchQuery && searchQuery.trim() !== "") {
        const safeQuery = escapeRegex(searchQuery.trim());
        const searchRegex = new RegExp(`^${safeQuery}`, "i");
        match.name = searchRegex;
    }

    const users = await User.find()
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

export default controller;
