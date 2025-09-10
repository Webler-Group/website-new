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

const avatarImageUpload = multer({
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        // povolí image/png, image/jpg, image/jpeg, image/gif
        if (/^image\/(png|jpe?g|gif)$/i.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only .png, .jpg, .jpeg and .gif files are allowed"));
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
    const { userId } = req.body;

    const isModerator = roles && roles.some(role => [RolesEnum.MODERATOR, RolesEnum.ADMIN].includes(role));

    const user = await User.findById(userId).lean();
    if (!user || (!user.active && !isModerator)) {
        res.status(404).json({ message: "Profile not found" });
        return
    }

    const isFollowing = currentUserId ?
        await UserFollowing.findOne({ user: currentUserId, following: userId }) !== null :
        false;

    const followers = await UserFollowing.countDocuments({ following: userId });
    const following = await UserFollowing.countDocuments({ user: userId });

    let codesQuery = Code
        .find({ user: userId })

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
    const { userId, name, bio, countryCode } = req.body;

    if (typeof name === "undefined" ||
        typeof bio === "undefined" ||
        typeof countryCode === "undefined"
    ) {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if (currentUserId !== userId) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    const user = await User.findById(currentUserId);

    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return
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
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        })
    }

})

const changeEmail = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { email, password } = req.body;

    if (typeof email === "undefined" ||
        typeof password === "undefined"
    ) {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const user = await User.findById(currentUserId);

    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return
    }

    const matchPassword = await user.matchPassword(password);
    if (!matchPassword) {
        res.json({
            success: false,
            error: { _message: "Incorrect information" },
            data: null
        })
        return
    }

    try {
        const code = await EmailChangeRecord.generate(new mongoose.Types.ObjectId(currentUserId), email);
        await sendEmailChangeVerification(user.name, user.email, email, code);

        res.json({
            success: true,
            data: {}
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            message: err?.message,
            data: null
        })
    }

});

const verifyEmailChange = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { code } = req.body;

    if (!code) {
        res.status(400).json({ message: "Missing code" });
        return;
    }

    const record = await EmailChangeRecord.findOne({ userId: currentUserId, code });

    if (!record) {
        res.status(400).json({ message: "Invalid or expired code" });
        return;
    }

    // Check expiration (15 minutes = 900000 ms)
    const now = Date.now();
    if (now - record.createdAt.getTime() > 15 * 60 * 1000) {
        await EmailChangeRecord.deleteOne({ _id: record._id }); // clean up expired record
        res.status(400).json({ message: "Code has expired" });
        return;
    }

    const user = await User.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    let result: any;
    try {
        user.email = record.newEmail;
        user.emailVerified = false; // must verify new email again
        await user.save();

        result = { success: true, data: { email: user.email } };
    } catch (err: any) {
        result = { success: false, data: null, error: err };
    } finally {
        await EmailChangeRecord.deleteOne({ _id: record._id });
    }

    res.json(result);
});


const sendActivationCode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const user = await User.findById(currentUserId);
    if (user === null) {
        res.status(404).json({ message: "User not found" });
        return
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
    const { userId } = req.body;

    if (typeof userId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if (userId === currentUserId) {
        res.status(400).json({ message: "Fields 'user' and 'following' cannot be same" });
        return
    }

    const userExists = await User.findOne({ _id: userId })
    if (!userExists) {
        res.status(404).json({ message: "Profile not found" });
        return
    }

    const exists = await UserFollowing.findOne({ user: currentUserId, following: userId })
    if (exists) {
        res.status(204).json({ success: true })
        return
    }

    const userFollowing = await UserFollowing.create({
        user: currentUserId,
        following: userId
    });

    if (userFollowing) {

        await Notification.sendToUsers([userId], {
            title: "New follower",
            actionUser: currentUserId!,
            type: NotificationTypeEnum.PROFILE_FOLLOW,
            message: "{action_user} followed you"
        });

        res.json({ success: true })
        return
    }

    res.status(500).json({ success: false });
});

const unfollow = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { userId } = req.body;

    if (typeof userId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if (userId === currentUserId) {
        res.status(400).json({ message: "Fields 'user' and 'following' cannot be same" });
        return
    }

    const userFollowing = await UserFollowing.findOne({ user: currentUserId, following: userId });
    if (userFollowing === null) {
        res.status(204).json({ success: true })
        return
    }

    const result = await UserFollowing.deleteOne({ user: currentUserId, following: userId })
    if (result.deletedCount == 1) {

        await Notification.deleteOne({
            user: userId,
            actionUser: currentUserId,
            _type: NotificationTypeEnum.PROFILE_FOLLOW
        })

        res.json({ success: true })
        return
    }

    res.status(500).json({ success: false });
});

const getFollowers = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { userId, page, count } = req.body;
    const currentUserId = req.userId;

    if (typeof page === "undefined" || typeof count === "undefined") {
        res.status(400).json({ message: "Some fileds are missing" });
        return
    }

    const result = await UserFollowing.find({ following: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles")
        .select("user") as any[];

    if (result) {
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
    }
    else {
        res.status(500).json({ success: false });
    }
});

const getFollowing = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { userId, page, count } = req.body;
    const currentUserId = req.userId;

    if (typeof page === "undefined" || typeof count === "undefined") {
        res.status(400).json({ message: "Some fileds are missing" });
        return
    }

    const result = await UserFollowing.find({ user: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("following", "name avatarImage countryCode level roles")
        .select("following") as any[];

    if (result) {
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
    }
    else {
        res.status(500).json({ success: false });
    }
});

const getNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { count, fromId } = req.body;

    if (typeof count === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    let dbQuery = Notification
        .find({ user: currentUserId, hidden: false })
        .sort({ createdAt: "desc" });

    if (typeof fromId !== "undefined") {
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
    }
    else {
        res.status(500).json({ message: "error" });
    }
})

const getUnseenNotificationCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const count = await Notification.countDocuments({ user: currentUserId, isClicked: false, hidden: false })

    res.json({ count });
})

const markNotificationsSeen = asyncHandler(async (req: IAuthRequest, res: Response) => {

    const { fromId } = req.body;

    if (typeof fromId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    // TODO

    res.json({});
})

const markNotificationsClicked = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const { ids } = req.body;

    if (typeof ids !== "undefined") {
        await Notification.updateMany({ _id: { $in: ids } }, { $set: { isClicked: true } })
    }
    else {
        await Notification.updateMany({ user: currentUserId, isClicked: false, hidden: false }, { $set: { isClicked: true } })
    }

    res.json({});
});

const uploadProfileAvatarImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    if (!req.file) {
        res.status(400).json({
            success: false,
            message: "No file uploaded"
        });
        return;
    }

    const user = await User.findById(currentUserId);
    if (!user) {
        fs.unlinkSync(req.file.path);

        res.status(404).json({ message: "User not found" });
        return;
    }

    try {

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
    } catch (err: any) {
        res.json({
            success: false,
            error: err
        });
    }

});

const updateNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { notifications } = req.body;

    if (!notifications || typeof notifications !== "object") {
        res.status(400).json({ message: "Invalid notifications object" });
        return;
    }

    const user = await User.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return
    }

    if (user.notifications) {
        for (let value of Object.values(NotificationTypeEnum)) {
            if (typeof notifications[value] !== "undefined") {
                user.notifications[value as NotificationTypeEnum] = notifications[value];
            }
        }
    }

    try {
        await user.save();

        res.json({
            success: true,
            data: {
                notifications: user.notifications
            }
        });
    } catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        });
    }
});

const searchProfiles = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { searchQuery } = req.body;

    const match: any = { active: true };

    if (searchQuery && searchQuery.trim() !== "") {
        const safeQuery = escapeRegex(searchQuery.trim());
        const searchRegex = new RegExp(`^${safeQuery}`, "i");
        match.name = searchRegex;
    }

    const users = await User.aggregate([
        { $match: match },
        {
            $lookup: {
                from: "userfollowings",
                localField: "_id",
                foreignField: "following",
                as: "followers"
            }
        },
        {
            $addFields: {
                followersCount: { $size: "$followers" }
            }
        },
        {
            $project: {
                name: 1,
                avatarImage: 1,
                level: 1,
                roles: 1,
                followersCount: 1,
                countryCode: 1
            }
        },
        { $sort: { followersCount: -1 } },
        { $limit: 10 }
    ]);

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
    markNotificationsSeen,
    markNotificationsClicked,
    sendActivationCode,
    uploadProfileAvatarImage,
    avatarImageUpload,
    updateNotifications,
    searchProfiles,
    verifyEmailChange
};

export default controller;
