import { IAuthRequest } from "../middleware/verifyJWT";
import User from "../models/User";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import UserFollowing from "../models/UserFollowing";
import Notification from "../models/Notification";

const getProfile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return
    }

    const isFollowing = currentUserId ?
        await UserFollowing.findOne({ user: currentUserId, following: userId }) !== null :
        false;

    const followers = await UserFollowing.countDocuments({ following: userId });
    const following = await UserFollowing.countDocuments({ user: userId });

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

})

const updateProfile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const userId = req.params.userId;
    const { email, name, bio, countryCode } = req.body;

    if (typeof name === "undefined" ||
        typeof email === "undefined" ||
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

    user.email = email;
    user.name = name;
    user.bio = bio;
    user.countryCode = countryCode;

    try {
        const updatedUser = await user.save();

        res.json({
            success: true,
            data: {
                id: updatedUser._id,
                email: updatedUser.email,
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

const changePassword = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword === "undefined" ||
        typeof newPassword === "undefined"
    ) {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    if (currentPassword === newPassword) {
        res.status(400).json({ message: "Passwords cannot be same" });
        return
    }

    const user = await User.findById(currentUserId);

    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return
    }

    const matchPassword = await user.matchPassword(currentPassword);
    if (!matchPassword) {
        res.json({
            success: false,
            error: { _message: "Incorrect information" },
            data: false
        })
        return
    }

    try {

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            data: true
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: false
        })
    }

})

const follow = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const userId = req.params.userId;

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

    const exists = await UserFollowing.findOne({ user: currentUserId, following: userId });
    if (exists) {
        res.status(204).json({ success: true })
        return
    }

    const userFollowing = await UserFollowing.create({
        user: currentUserId,
        following: userId
    });

    if (userFollowing) {
        await Notification.create({
            user: userId,
            actionUser: currentUserId,
            _type: 101,
            message: "{action_user} followed you"
        })

        res.json({ success: true })
        return
    }

    res.status(500).json({ success: false });
});

const unfollow = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const userId = req.params.userId;

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
            _type: 101
        })

        res.json({ success: true })
        return
    }

    res.status(500).json({ success: false });
});

const getFollowers = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = req.params.userId;
    const query = req.query;
    const currentUserId = req.userId;

    const page = Number(query.page);
    const count = Number(query.count);

    if (!Number.isInteger(page) || !Number.isInteger(count)) {
        res.status(400).json({ message: "Invalid query params" });
        return
    }

    const result = await UserFollowing.find({ following: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", "name avatarUrl countryCode level roles")
        .select("user") as any[];

    if (result) {
        const promises: Promise<void>[] = [];
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
    const userId = req.params.userId;
    const query = req.query;
    const currentUserId = req.userId;

    const page = Number(query.page);
    const count = Number(query.count);

    if (!Number.isInteger(page) || !Number.isInteger(count)) {
        res.status(400).json({ message: "Invalid query params" });
        return
    }

    const result = await UserFollowing.find({ user: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("following", "name avatarUrl countryCode level roles")
        .select("following") as any[];

    if (result) {
        const promises: Promise<void>[] = [];
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
        .find({ user: currentUserId })
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
        .populate("user", "name avatarUrl countryCode level roles")
        .populate("actionUser", "name avatarUrl countryCode level roles")
        .populate("postId", "parentId") as any[];


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
})

const getUnseenNotificationCount = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;

    const count = await Notification.countDocuments({ user: currentUserId, isClicked: false })

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
        await Notification.updateMany({ user: currentUserId, isClicked: false }, { $set: { isClicked: true } })
    }

    res.json({});
})

const controller = {
    getProfile,
    updateProfile,
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

export default controller;