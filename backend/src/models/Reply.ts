import mongoose, { InferSchemaType } from "mongoose";

const replySchema = new mongoose.Schema({
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

const Reply = mongoose.model<InferSchemaType<typeof replySchema>>("Reply", replySchema);

export default Reply;