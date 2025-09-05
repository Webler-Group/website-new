import mongoose, { InferSchemaType } from "mongoose";
import ReactionsEnum from "../data/ReactionsEnum";

const upvoteSchema = new mongoose.Schema({
    parentId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    reaction: {
        type: Number,
        enum: Object.values(ReactionsEnum).map(Number),
        required: false
    }
});

const Upvote = mongoose.model<InferSchemaType<typeof upvoteSchema>>("Upvote", upvoteSchema);

export default Upvote;