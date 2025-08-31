"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const compilerLanguages_1 = __importDefault(require("../config/compilerLanguages"));
const Post_1 = __importDefault(require("./Post"));
const Upvote_1 = __importDefault(require("./Upvote"));
const codeSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Types.ObjectId,
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
        enum: compilerLanguages_1.default
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
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
// Add manual updatedAt
codeSchema.add({
    updatedAt: { type: Date, default: Date.now }
});
// Pre-save hook: only bump updatedAt when *content fields* change
codeSchema.pre("save", function (next) {
    if (this.isModified("source") ||
        this.isModified("cssSource") ||
        this.isModified("jsSource")) {
        this.set("updatedAt", new Date());
    }
    next();
});
codeSchema.statics.deleteAndCleanup = async function (codeId) {
    await Post_1.default.deleteAndCleanup({ codeId: codeId, parentId: null });
    await Upvote_1.default.deleteMany({ parentId: codeId });
    await Code.deleteOne({ _id: codeId });
};
const Code = mongoose_1.default.model("Code", codeSchema);
exports.default = Code;
