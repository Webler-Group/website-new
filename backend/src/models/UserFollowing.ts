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

userFollowingSchema.index({ user: 1, following: 1 }, { unique: true });

const UserFollowing = mongoose.model("UserFollowing", userFollowingSchema);

export default UserFollowing;