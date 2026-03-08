import mongoose, { Types } from "mongoose";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import User from "../models/User";
import { getIO, onlineUsers, uidRoom } from "../config/socketServer";
import { sendPushToUsers } from "../services/pushService";
import NotificationModel from "../models/Notification";
import HttpError from "../exceptions/HttpError";

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
    const allowedUserDocs = await User.find({
        _id: { $in: userIds },
        [`notifications.${params.type}`]: true
    }, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>().session(session ?? null);
    const allowedUserIds = allowedUserDocs.map(doc => doc._id);

    const allowedOfflineUserIds = allowedUserIds.filter(
        userId => !onlineUsers.has(userId.toString())
    );

    const currentUser = await User.findById(params.actionUser, { name: 1 }).lean().session(session ?? null);
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
    if (io) {
        for (const userId of allowedUserIds) {
            io.to(uidRoom(userId.toString()))
                .emit("notification:new", {});
        }
    }
}

export const deleteNotifications = async (filter: mongoose.QueryFilter<Notification>, session?: mongoose.ClientSession) => {
    const notificationsToDelete = await NotificationModel.find(filter).session(session ?? null);
    await NotificationModel.deleteMany(filter, { session });
    const io = getIO();
    if (io) {
        io.to(notificationsToDelete.filter(doc => !doc.isClicked)
            .map(doc => uidRoom(doc.user.toString())))
            .emit("notification:deleted", {});
    }
}