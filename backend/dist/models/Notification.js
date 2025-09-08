"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const socketServer_1 = require("../config/socketServer");
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const notificationSchema = new mongoose_1.default.Schema({
    _type: { type: Number, required: true, enum: Object.values(NotificationTypeEnum_1.default).map(Number) },
    message: { type: String, required: true },
    user: { type: mongoose_1.default.Types.ObjectId, ref: "User", required: true },
    actionUser: { type: mongoose_1.default.Types.ObjectId, ref: "User", required: true },
    isSeen: { type: Boolean, default: false },
    isClicked: { type: Boolean, default: false },
    codeId: { type: mongoose_1.default.Types.ObjectId, ref: "Code" },
    questionId: { type: mongoose_1.default.Types.ObjectId, ref: "Post" },
    postId: { type: mongoose_1.default.Types.ObjectId, ref: "Post" },
    feedId: { type: mongoose_1.default.Types.ObjectId, ref: "Post" },
    lessonId: { type: mongoose_1.default.Types.ObjectId, ref: "CourseLesson" },
    courseCode: { type: String },
    hidden: { type: Boolean, default: false }
}, {
    timestamps: true
});
// --- SAVE ---
notificationSchema.post("save", (doc, next) => {
    const io = (0, socketServer_1.getIO)();
    if (io) {
        io.to((0, socketServer_1.uidRoom)(doc.user.toString())).emit("notification:new", {});
    }
    return next();
});
// --- DELETE ONE ---
notificationSchema.pre("deleteOne", { document: false, query: true }, async function (next) {
    const filter = this.getFilter();
    const doc = await this.model.findOne(filter);
    this._docToDelete = doc;
    next();
});
notificationSchema.post("deleteOne", { document: false, query: true }, function () {
    const doc = this._docToDelete;
    if (doc && !doc.isClicked) {
        const io = (0, socketServer_1.getIO)();
        if (io) {
            io.to((0, socketServer_1.uidRoom)(doc.user.toString())).emit("notification:deleted", {});
        }
    }
});
// --- DELETE MANY ---
notificationSchema.pre("deleteMany", { document: false, query: true }, async function (next) {
    const filter = this.getFilter();
    const docs = await this.model.find(filter);
    this._docsToDelete = docs;
    next();
});
notificationSchema.post("deleteMany", { document: false, query: true }, function () {
    const docs = this._docsToDelete;
    if (!docs)
        return;
    const io = (0, socketServer_1.getIO)();
    if (io) {
        io.to(docs.filter(x => !x.isClicked).map(x => (0, socketServer_1.uidRoom)(x.user.toString()))).emit("notification:deleted", {});
    }
});
const Notification = mongoose_1.default.model("Notification", notificationSchema);
exports.default = Notification;
