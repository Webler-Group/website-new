"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const socketServer_1 = require("../config/socketServer");
const notificationSchema = new mongoose_1.default.Schema({
    /*
    * 101 - {action_user} followed you
    * 201 - {action_user} answered your question
    * 202 - {action_user} posted comment on your code
    */
    _type: {
        type: Number,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
    actionUser: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
    isSeen: {
        type: Boolean,
        default: false
    },
    isClicked: {
        type: Boolean,
        default: false
    },
    codeId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Code"
    },
    questionId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post"
    },
    postId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post"
    },
    hidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
notificationSchema.post("save", (doc, next) => {
    const io = (0, socketServer_1.getIO)();
    if (io) {
        io.to((0, socketServer_1.uidRoom)(doc.user.toString())).emit("notification:new", {});
    }
    return next();
});
const Notification = mongoose_1.default.model("Notification", notificationSchema);
exports.default = Notification;
