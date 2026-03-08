import { IAuthRequest } from "../middleware/verifyJWT";
import UserModel, { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { Response } from "express";
import asyncHandler from "express-async-handler";
import UserFollowingModel from "../models/UserFollowing";
import NotificationModel from "../models/Notification";
import CodeModel, { CODE_MINIMAL_FIELDS } from "../models/Code";
import { signEmailToken } from "../utils/tokenUtils";
import { sendActivationEmail, sendEmailChangeVerification } from "../services/email";
import { config } from "../confg";
import PostModel from "../models/Post";
import { escapeRegex } from "../utils/regexUtils";
import EmailChangeRecord from "../models/EmailChangeRecord";
import mongoose, { Types } from "mongoose";
import RolesEnum from "../data/RolesEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import PostTypeEnum from "../data/PostTypeEnum";
import { parseWithZod } from "../utils/zodUtils";
import { changeEmailSchema, followSchema, getFollowersSchema, getFollowingSchema, getNotificationsSchema, getProfileSchema, markNotificationsClickedSchema, removeProfileImageSchema, searchProfilesSchema, unfollowSchema, updateNotificationsSchema, updateProfileSchema, uploadProfileAvatarImageSchema, verifyEmailChangeSchema } from "../validation/profileSchema";
import ChallengeSubmissionModel from "../models/ChallengeSubmission";
import { createFolder, deleteEntry, listDirectory, moveEntry, uploadImageToBlob } from "../helpers/fileHelper";
import uploadImage from "../middleware/uploadImage";
import FileModel from "../models/File";
import { createImageFolderSchema, deleteImageSchema, getImageListSchema, moveImageSchema, uploadImageSchema } from "../validation/imagesSchema";
import FileTypeEnum from "../data/FileTypeEnum";
import { getImageUrl } from "./mediaController";
import { formatUserMinimal, generateEmailChangeRecord } from "../helpers/userHelper";
import { deleteNotifications, sendNotifications } from "../helpers/notificationHelper";
import { Tag } from "../models/Tag";

const getProfile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const roles = req.roles;
    const { body } = parseWithZod(getProfileSchema, req);
    const { userId } = body;

    const isModerator = roles && roles.some(role => [RolesEnum.MODERATOR, RolesEnum.ADMIN].includes(role));

    const user = await UserModel.findById(userId).lean();
    if (!user || (!user.active && !isModerator)) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return
    }

    const isFollowing = currentUserId ?
        await UserFollowingModel.findOne({ user: currentUserId, following: userId }) !== null :
        false;

    const followers = await UserFollowingModel.countDocuments({ following: userId });
    const following = await UserFollowingModel.countDocuments({ user: userId });

    let codesQuery = CodeModel
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
        .select(CODE_MINIMAL_FIELDS)
        .lean();

    const questions = await PostModel.find({ user: userId, _type: PostTypeEnum.QUESTION }, { message: 0 })
        .sort({ createdAt: "desc" })
        .limit(5)
        .populate<{ tags: Tag[] }>("tags")
        .lean()

    const solvedAgg = await ChallengeSubmissionModel.aggregate([
        {
            $match: {
                user: user._id,
                passed: true
            }
        },
        {
            $group: {
                _id: "$challenge",
            }
        },
        {
            $lookup: {
                from: "challenges",
                localField: "_id",
                foreignField: "_id",
                as: "challenge"
            }
        },
        { $unwind: "$challenge" },
        {
            $group: {
                _id: "$challenge.difficulty",
                count: { $sum: 1 }
            }
        }
    ]);

    const solvedChallenges = {
        easy: 0,
        medium: 0,
        hard: 0
    } as Record<string, number>;

    for (const row of solvedAgg) {
        if (row._id) solvedChallenges[row._id] = row.count;
    }

    res.json({
        userDetails: {
            id: user._id,
            name: user.name,
            email: currentUserId === userId ? user.email : null,
            bio: user.bio,
            avatarUrl: getImageUrl(user.avatarHash),
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
            solvedChallenges
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

    const user = await UserModel.findById(userId);

    if (!user) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }

    if (user.name != name && await UserModel.exists({ name })) {
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

    const user = await UserModel.findById(currentUserId);

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

    const code = await generateEmailChangeRecord(new mongoose.Types.ObjectId(currentUserId), email);
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

    const user = await UserModel.findById(currentUserId);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    if (await UserModel.exists({ email: record.newEmail })) {
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

    const user = await UserModel.findById(currentUserId);
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

    const userExists = await UserModel.exists({ _id: userId });
    if (!userExists) {
        res.status(404).json({ error: [{ message: "Profile not found" }] });
        return;
    }

    const exists = await UserFollowingModel.exists({ user: currentUserId, following: userId });
    if (exists) {
        res.status(204).json({ success: true });
        return;
    }

    await UserFollowingModel.create({
        user: currentUserId,
        following: userId
    });

    await sendNotifications({
        title: "New follower",
        actionUser: new Types.ObjectId(currentUserId),
        type: NotificationTypeEnum.PROFILE_FOLLOW,
        message: "{action_user} followed you"
    }, [new Types.ObjectId(userId)]);

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

    const userFollowing = await UserFollowingModel.findOne({ user: currentUserId, following: userId });
    if (userFollowing === null) {
        res.status(204).json({ success: true });
        return;
    }

    const result = await UserFollowingModel.deleteOne({ user: currentUserId, following: userId })
    if (result.deletedCount == 1) {

        await deleteNotifications({
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

    const result = await UserFollowingModel.find({ following: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("user", USER_MINIMAL_FIELDS)
        .select("user")
        .lean<{ user: UserMinimal & { _id: Types.ObjectId } }[]>();

    const promises: Promise<void>[] = [];
    const data = result.map(x => formatUserMinimal(x.user));


    for (let i = 0; i < data.length; ++i) {
        const user = data[i];
        promises.push(UserFollowingModel.findOne({ user: currentUserId, following: user.id })
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

    const result = await UserFollowingModel.find({ user: userId })
        .sort({ createdAt: "desc" })
        .skip((page - 1) * count)
        .limit(count)
        .populate("following", USER_MINIMAL_FIELDS)
        .select("following")
        .lean<{ following: UserMinimal & { _id: Types.ObjectId } }[]>();

    const promises: Promise<void>[] = [];
    const data = result.map(x => formatUserMinimal(x.following));


    for (let i = 0; i < data.length; ++i) {
        const user = data[i];
        promises.push(UserFollowingModel.findOne({ user: currentUserId, following: user.id })
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

    let dbQuery = NotificationModel
        .find({ user: currentUserId, hidden: false })
        .sort({ createdAt: "desc" });

    if (fromId) {
        const prevNotification = await NotificationModel.findById(fromId);

        if (prevNotification !== null) {
            dbQuery = dbQuery
                .where({ createdAt: { $lt: prevNotification.createdAt } });
        }
    }

    const result = await dbQuery
        .limit(count)
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS)
        .populate<{ actionUser: UserMinimal & { _id: Types.ObjectId } }>("actionUser", USER_MINIMAL_FIELDS)
        .populate<{ postId: { _id: Types.ObjectId, parentId: Types.ObjectId } }>("postId", { parentId: 1 });

    const data = result.map(x => ({
        id: x._id,
        type: x._type,
        message: x.message,
        date: x.createdAt,
        user: formatUserMinimal(x.user),
        actionUser: formatUserMinimal(x.actionUser),
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

    const count = await NotificationModel.countDocuments({ user: currentUserId, isClicked: false, hidden: false })

    res.json({ count });
});

const markNotificationsClicked = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(markNotificationsClickedSchema, req);
    const { ids } = body;

    if (ids) {
        await NotificationModel.updateMany({ _id: { $in: ids } }, { $set: { isClicked: true } })
    }
    else {
        await NotificationModel.updateMany({ user: currentUserId, isClicked: false, hidden: false }, { $set: { isClicked: true } })
    }

    res.json({});
});

const uploadProfileAvatarImage = asyncHandler(async (req: IAuthRequest, res) => {
    const { body, file } = parseWithZod(uploadProfileAvatarImageSchema, req)
    const { userId } = body;
    const currentUserId = req.userId!;

    const user = await UserModel.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    if (currentUserId !== userId && !req.roles?.includes(RolesEnum.ADMIN)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const fileDoc = await uploadImageToBlob({
        authorId: currentUserId,
        buffer: file.buffer,
        name: "avatar",
        path: `users/${user._id}/avatar`,
        inputMime: file.mimetype,
        maxWidth: 256,
        maxHeight: 256,
        fit: "cover", // square crop avatar
        outputFormat: "webp",
        quality: 82,
    });

    user.avatarFileId = fileDoc._id;
    user.avatarHash = fileDoc.contenthash;
    await user.save();

    res.json({
        success: true,
        data: {
            avatarFileId: fileDoc._id,
            avatarUrl: getImageUrl(fileDoc.contenthash)
        },
    });
});

const avatarImageUploadMiddleware = uploadImage({
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedMimeRegex: /^image\/(png|jpe?g|webp|avif)$/i
});

const removeProfileAvatarImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(removeProfileImageSchema, req);
    const { userId } = body;
    const currentUserId = req.userId;

    const user = await UserModel.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    if (currentUserId !== userId && !req.roles?.includes(RolesEnum.ADMIN)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    if (user.avatarFileId) {
        user.avatarFileId = undefined;
        user.avatarHash = undefined;
        await user.save();

        await deleteEntry(`users/${user._id}/avatar`, "avatar");
    }

    res.json({ success: true });
});

const updateNotifications = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { body } = parseWithZod(updateNotificationsSchema, req);
    const { notifications } = body;

    const user = await UserModel.findById(currentUserId);
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

    const users = await UserModel.find(match, USER_MINIMAL_FIELDS);

    res.json({
        users: users.map(u => formatUserMinimal(u))
    });
});

const uploadPostImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body, file } = parseWithZod(uploadImageSchema, req);
    const { name, subPath } = body;

    const currentUserId = req.userId!;
    const basePath = `users/${currentUserId}/post-images`;

    const finalPath = subPath
        ? `${basePath}/${subPath}`
        : basePath;

    const fileDoc = await uploadImageToBlob({
        authorId: currentUserId,
        buffer: file.buffer,
        inputMime: file.mimetype,
        path: finalPath,
        name,
        maxWidth: 720,
        maxHeight: 720,
        fit: "inside",
        outputFormat: "webp",
        quality: 70,
    });

    res.json({
        success: true,
        data: {
            id: fileDoc._id,
            name: fileDoc.name,
            mimetype: fileDoc.mimetype,
            size: fileDoc.size,
            updatedAt: fileDoc.updatedAt,
            url: getImageUrl(fileDoc.contenthash),
            previewUrl: fileDoc.preview ? `/media/files/${fileDoc.contenthash}/preview` : null
        }
    });
});

const postImageUploadMiddleware = uploadImage({
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedMimeRegex: /^image\/(png|jpe?g|webp|avif)$/i
});

const getPostImageList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId!;
    const { body } = parseWithZod(getImageListSchema, req);
    const { userId, subPath } = body;

    const targetUserId = userId ?? currentUserId;

    if (targetUserId !== currentUserId && !req.roles?.includes(RolesEnum.ADMIN)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const basePath = `users/${targetUserId}/post-images`;
    const fullPath = subPath
        ? `${basePath}/${subPath}`
        : basePath;

    const items = await listDirectory(fullPath);

    res.json({
        success: true,
        items: items.map((x) => ({
            id: x._id,
            author: formatUserMinimal(x.author),
            type: x._type,
            name: x.name,
            mimetype: x.mimetype,
            size: x.size,
            updatedAt: x.updatedAt,
            url: getImageUrl(x.contenthash),
            previewUrl: (x._type === FileTypeEnum.FILE && x.preview) ? `/media/files/${x.contenthash}/preview` : null
        }))
    });
});

const deletePostImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId!;
    const { body } = parseWithZod(deleteImageSchema, req);
    const { fileId } = body;

    const fileDoc = await FileModel.findById(fileId).select("author name path").lean();
    if (!fileDoc) {
        res.status(404).json({ error: [{ message: "File not found" }] });
        return;
    }

    if (fileDoc.author.toString() !== currentUserId && !req.roles?.includes(RolesEnum.ADMIN)) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const basePath = `users/${currentUserId}/post-images`;
    if (!fileDoc.path.startsWith(basePath)) {
        res.status(400).json({ error: [{ message: "Not a post image" }] });
        return;
    }

    await deleteEntry(fileDoc.path, fileDoc.name);

    res.json({ success: true });
});

const createPostImageFolder = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId!;
    const { body } = parseWithZod(createImageFolderSchema, req);
    const { name, subPath } = body;

    const basePath = `users/${currentUserId}/post-images`;

    const finalPath = subPath
        ? `${basePath}/${subPath}`
        : basePath;

    const folder = await createFolder(currentUserId, finalPath, name);

    res.json({
        success: true,
        data: {
            id: folder._id,
            name: folder.name,
            updatedAt: folder.updatedAt
        }
    });
});

const movePostImage = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId!;
    const { body } = parseWithZod(moveImageSchema, req);
    const { fileId, newName, newSubPath } = body;

    const fileDoc = await FileModel.findById(fileId).select("author path name");
    if (!fileDoc) {
        res.status(404).json({ error: [{ message: "File not found" }] });
        return;
    }

    const isOwner = fileDoc.author.toString() === currentUserId;
    const isAdmin = req.roles?.includes(RolesEnum.ADMIN);

    if (!isOwner && !isAdmin) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    const basePath = `users/${fileDoc.author.toString()}/post-images`;

    if (!fileDoc.path.startsWith(basePath)) {
        res.status(400).json({ error: [{ message: "Not a post image" }] });
        return;
    }

    const targetPath = newSubPath
        ? `${basePath}/${newSubPath}`
        : basePath;

    const targetName = newName ?? fileDoc.name;

    await moveEntry(
        fileDoc.path,
        fileDoc.name,
        targetPath,
        targetName
    );

    res.json({ success: true });
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
    avatarImageUploadMiddleware,
    updateNotifications,
    searchProfiles,
    verifyEmailChange,
    uploadPostImage,
    postImageUploadMiddleware,
    getPostImageList,
    deletePostImage,
    createPostImageFolder,
    movePostImage
};

export default controller;
