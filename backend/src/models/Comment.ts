import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    isAccepted: {
        type: Boolean,
        default: false
    },
    parentId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1000
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
}, {
    timestamps: true
});

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;