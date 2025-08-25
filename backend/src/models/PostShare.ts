import mongoose from 'mongoose'

const postSharingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    originalPost: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        required: true
    },
    sharedPost: {
        type: mongoose.Types.ObjectId,
        ref: "Post", 
        required: true
    }
})

const PostSharing = mongoose.model("PostSharing", postSharingSchema);

export default PostSharing;