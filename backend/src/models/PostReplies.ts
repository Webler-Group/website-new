import mongoose from "mongoose";

const postReplies = new mongoose.Schema({
    parentId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    reply: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        required: true
    },
    feedId: {
        type: mongoose.Types.ObjectId,
        ref: "Post", 
        required: true
    }
});

const PostReplies = mongoose.model("postreplies", postReplies);

export default PostReplies;