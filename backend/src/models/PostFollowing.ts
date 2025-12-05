import mongoose from "mongoose";

const postFollowingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    following: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        required: true
    }
});

const PostFollowing = mongoose.model("PostFollowing", postFollowingSchema);

export default PostFollowing;