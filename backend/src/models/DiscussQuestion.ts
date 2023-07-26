import mongoose from "mongoose";

const discussQuestionSchema = new mongoose.Schema({
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
        type: [String],
        required: true,
        validate: (v: any) => Array.isArray(v) && v.length > 0 && v.every(x => typeof x === "string" && x.length > 0 && x.length <= 20)
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
}, {
    timestamps: true
});

const DiscussQuestion = mongoose.model("DiscussQuestion", discussQuestionSchema);

export default DiscussQuestion;