import mongoose, { InferSchemaType, Model, Types } from "mongoose";
import { getIO, onlineUsers, uidRoom } from "../config/socketServer";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import User from "./User";
import { sendPushToUsers } from "../services/pushService";

interface SendToUsersParams {
    type: NotificationTypeEnum;
    title: string;
    url?: string;
    message: string;
    actionUser: string | Types.ObjectId;
    postId?: string | Types.ObjectId;
    questionId?: string | Types.ObjectId;
    feedId?: string | Types.ObjectId;
    lessonId?: string | Types.ObjectId;
    codeId?: string | Types.ObjectId;
    courseCode?: string;
}

const notificationSchema = new mongoose.Schema({
    _type: { type: Number, required: true, enum: Object.values(NotificationTypeEnum).map(Number) },
    message: { type: String, required: true },
    user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    actionUser: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    isSeen: { type: Boolean, default: false },
    isClicked: { type: Boolean, default: false },
    codeId: { type: mongoose.Types.ObjectId, ref: "Code" },
    questionId: { type: mongoose.Types.ObjectId, ref: "Post" },
    postId: { type: mongoose.Types.ObjectId, ref: "Post" },
    feedId: { type: mongoose.Types.ObjectId, ref: "Post" },
    lessonId: { type: mongoose.Types.ObjectId, ref: "CourseLesson" },
    courseCode: { type: String },
    hidden: { type: Boolean, default: false }
}, {
    timestamps: true
});

notificationSchema.pre("save", async function (next) {
    try {
        const user = await User.findById(this.user)
            .select({ notifications: 1 })
            .lean();

        if (!user) {
            return next(new Error("User not found, cannot create notification"));
        }

        if (user.notifications && user.notifications[this._type as NotificationTypeEnum] === false) {
            return next(new Error("Notification type disabled for this user"));
        }

        return next();
    } catch (err) {
        return next(err as any);
    }
});

// --- SAVE ---
notificationSchema.post("save", (doc, next) => {
    const io = getIO();
    if (io) {
        io.to(uidRoom(doc.user.toString())).emit("notification:new", {});
    }
    return next();
});

// --- DELETE ONE ---
notificationSchema.pre("deleteOne", { document: false, query: true }, async function (next) {
    const filter = this.getFilter();
    const doc = await this.model.findOne(filter);
    (this as any)._docToDelete = doc;
    next();
});

notificationSchema.post("deleteOne", { document: false, query: true }, function () {
    const doc = (this as any)._docToDelete;
    if (doc && !doc.isClicked) {
        const io = getIO();
        if (io) {
            io.to(uidRoom(doc.user.toString())).emit("notification:deleted", {});
        }
    }
});

// --- DELETE MANY ---
notificationSchema.pre("deleteMany", { document: false, query: true }, async function (next) {
    const filter = this.getFilter();
    const docs = await this.model.find(filter);
    (this as any)._docsToDelete = docs;
    next();
});

notificationSchema.post("deleteMany", { document: false, query: true }, function () {
    const docs = (this as any)._docsToDelete as any[];
    if (!docs) return;

    const io = getIO();
    if (io) {
        io.to(docs.filter(x => !x.isClicked).map(x => uidRoom(x.user.toString()))).emit("notification:deleted", {});
    }
});

notificationSchema.statics.sendToUsers = async function (userIds: (string | Types.ObjectId)[], params: SendToUsersParams, onlyPush: boolean = false) {
    const allowedUserDocs = await User.find({
        _id: { $in: userIds },
        [`notifications.${params.type}`]: true
    }).select('_id');

    const allowedUserIds = allowedUserDocs.map(doc => doc._id);
    const allowedOfflineUserIds = allowedUserIds.filter(userId => !onlineUsers.has(userId.toString()));

    const currentUserName = (await User.findById(params.actionUser, "name"))?.name ?? "DeletedUser";

    await sendPushToUsers(allowedOfflineUserIds, {
        title: params.title,
        body: params.message.replace("{action_user}", currentUserName),
        url: params.url
    });

    if(onlyPush) return;

    await Promise.all(allowedUserIds.map(userId => Notification.create({
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
    })));
}

declare interface INotification extends InferSchemaType<typeof notificationSchema> { }

interface NotificationModel extends Model<INotification> {
    sendToUsers: (userIds: (string | Types.ObjectId)[], params: SendToUsersParams, onlyPush?: boolean) => Promise<void>;
}

const Notification = mongoose.model<INotification, NotificationModel>("Notification", notificationSchema);
export default Notification;
