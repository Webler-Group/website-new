"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const compilerLanguages_1 = __importDefault(require("../config/compilerLanguages"));
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
}, {
    timestamps: true
});
const Code = mongoose_1.default.model("Code", codeSchema);
exports.default = Code;
