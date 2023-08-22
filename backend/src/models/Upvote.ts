import mongoose, { InferSchemaType } from "mongoose";

const upvoteSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    }
});

const Upvote = mongoose.model<InferSchemaType<typeof upvoteSchema>>("Upvote", upvoteSchema);

export default Upvote;