import mongoose, { InferSchemaType } from "mongoose";
import { getIO, uidRoom } from "../config/socketServer";

const notificationSchema = new mongoose.Schema({
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
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    actionUser: {
        type: mongoose.Types.ObjectId,
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
        type: mongoose.Types.ObjectId,
        ref: "Code"
    },
    questionId: {
        type: mongoose.Types.ObjectId,
        ref: "Post"
    },
    postId: {
        type: mongoose.Types.ObjectId,
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
    const io = getIO();
    if(io) {
        io.to(uidRoom(doc.user.toString())).emit("notification:new", {});
    }

    return next();
});

const Notification = mongoose.model<InferSchemaType<typeof notificationSchema>>("Notification", notificationSchema);

export default Notification;