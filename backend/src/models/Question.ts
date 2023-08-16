import mongoose, { InferSchemaType } from "mongoose";

const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 60
    },
    message: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1000
    },
    tags: {
        type: [{ type: mongoose.Types.ObjectId, ref: "Tag" }],
        required: true,
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
}, {
    timestamps: true
});

const Question = mongoose.model<InferSchemaType<typeof questionSchema>>("Question", questionSchema);

export default Question;