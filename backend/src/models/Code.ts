import mongoose, { InferSchemaType } from "mongoose";
import compilerLanguagesEnum from "../config/compilerLanguages";

const codeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    votes: {
        type: Number,
        default: 0
    },
    comments: {
        type: Number,
        default: 0
    },
    name: {
        type: String,
        trim: true,
        minLength: 1,
        maxLength: 120,
        required: true
    },
    language: {
        type: String,
        required: true,
        enum: compilerLanguagesEnum
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    source: {
        type: String,
        default: ""
    },
    cssSource: {
        type: String,
        default: ""
    },
    jsSource: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
})

const Code = mongoose.model<InferSchemaType<typeof codeSchema>>("Code", codeSchema);

export default Code;