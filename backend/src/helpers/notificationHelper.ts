import mongoose, { Types } from "mongoose";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import UserModel, { NotificationSettings } from "../models/User";
import { getIO, onlineUsers, uidRoom } from "../config/socketServer";
import { sendPushToUsers } from "../services/pushService";
import NotificationModel from "../models/Notification";
import HttpError from "../exceptions/HttpError";

export const notificationTypeToField: Record<NotificationTypeEnum, keyof NotificationSettings> = {
    [NotificationTypeEnum.PROFILE_FOLLOW]: "profileFollow",
    [NotificationTypeEnum.QA_ANSWER]: "qaAnswer",
    [NotificationTypeEnum.CODE_COMMENT]: "codeComment",
    [NotificationTypeEnum.QA_QUESTION_MENTION]: "qaQuestionMention",
    [NotificationTypeEnum.QA_ANSWER_MENTION]: "qaAnswerMention",
    [NotificationTypeEnum.CODE_COMMENT_MENTION]: "codeCommentMention",
    [NotificationTypeEnum.FEED_FOLLOWER_POST]: "feedFollowerPost",
    [NotificationTypeEnum.FEED_COMMENT]: "feedComment",
    [NotificationTypeEnum.FEED_SHARE]: "feedShare",
    [NotificationTypeEnum.FEED_PIN]: "feedPin",
    [NotificationTypeEnum.FEED_COMMENT_MENTION]: "feedCommentMention",
    [NotificationTypeEnum.LESSON_COMMENT]: "lessonComment",
    [NotificationTypeEnum.LESSON_COMMENT_MENTION]: "lessonCommentMention",
    [NotificationTypeEnum.CHANNELS]: "channels",
};

export interface SendNotificationsParams {
    type: NotificationTypeEnum;
    title: string;
    url?: string;
    message: string;
    actionUser: Types.ObjectId;
    postId?: Types.ObjectId;
    questionId?: Types.ObjectId;
    feedId?: Types.ObjectId;
    lessonId?: Types.ObjectId;
    codeId?: Types.ObjectId;
    courseCode?: string;
}

export const sendNotifications = async (params: SendNotificationsParams, userIds: Types.ObjectId[], onlyPush: boolean = false, session?: mongoose.ClientSession) => {
    const field = notificationTypeToField[params.type];

    const allowedUserDocs = await UserModel.find({
        _id: { $in: userIds },
        [`notifications.${field}`]: { $ne: false }
    }, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>().session(session ?? null);

    const allowedUserIds = allowedUserDocs.map(doc => doc._id);

    const allowedOfflineUserIds = allowedUserIds.filter(
        userId => !onlineUsers.has(userId.toString())
    );

    const currentUser = await UserModel.findById(params.actionUser, { name: 1 }).lean().session(session ?? null);
    if (!currentUser) {
        throw new HttpError("Action user not found", 404);
    }

    await sendPushToUsers(allowedOfflineUserIds, {
        title: params.title,
        body: params.message.replace("{action_user}", currentUser.name),
        url: params.url
    });

    if (onlyPush) return;

    await NotificationModel.insertMany(allowedUserIds.map(userId => ({
        user: userId,
        _type: params.type,
        actionUser: params.actionUser,
        message: params.message,
        postId: params.postId,
        questionId: params.questionId,
        lessonId: params.lessonId,
        feedId: params.feedId,
        codeId: params.codeId,
        courseCode: params.courseCode
    })), { session });

    const io = getIO();
    for (const userId of allowedUserIds) {
        io?.to(uidRoom(userId.toString())).emit("notification:new", {});
    }
};

export const deleteNotifications = async (filter: mongoose.QueryFilter<Notification>, session?: mongoose.ClientSession) => {
    const notificationsToDelete = await NotificationModel.find(filter).session(session ?? null);
    await NotificationModel.deleteMany(filter, { session });
    const io = getIO();
    io?.to(notificationsToDelete.filter(doc => !doc.isClicked)
        .map(doc => uidRoom(doc.user.toString())))
        .emit("notification:deleted", {});
}