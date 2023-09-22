import mongoose, { InferSchemaType } from "mongoose";

const notificationSchema = new mongoose.Schema({
    /*
    * 101 - {actionUser} followed you
    * 
    *
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

}, {
    timestamps: true
});

const Notification = mongoose.model<InferSchemaType<typeof notificationSchema>>("Notification", notificationSchema);

export default Notification;