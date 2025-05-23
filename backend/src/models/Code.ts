import mongoose, { InferSchemaType, Model } from "mongoose";
import compilerLanguagesEnum from "../config/compilerLanguages";
import Post from "./Post";
import Upvote from "./Upvote";

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
    },
    hidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

codeSchema.statics.deleteAndCleanup = async function(codeId: mongoose.Types.ObjectId) {
    await Post.deleteAndCleanup({ codeId: codeId, parentId: null });
    await Upvote.deleteMany({ parentId: codeId });
    await Code.deleteOne({ _id: codeId });
}

declare interface ICode extends InferSchemaType<typeof codeSchema> {}

interface CodeModel extends Model<ICode> {
    deleteAndCleanup(codeId: mongoose.Types.ObjectId): Promise<any>;
}

const Code = mongoose.model<ICode, CodeModel>("Code", codeSchema);

export default Code;
