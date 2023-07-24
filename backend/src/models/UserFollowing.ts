import mongoose from "mongoose";

const userFollowingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    following: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

const UserFollowing = mongoose.model("UserFollowing", userFollowingSchema);

export default UserFollowing;