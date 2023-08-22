import mongoose, { InferSchemaType } from "mongoose";

const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 120
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
        validate: [(val: mongoose.Types.ObjectId[]) => val.length <= 10, "tags exceed limit of 10"],
        required: true,
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    isAccepted: {
        type: Boolean,
        default: false
    },
    votes: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Question = mongoose.model<InferSchemaType<typeof questionSchema>>("Question", questionSchema);

export default Question;