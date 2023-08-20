"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const questionSchema = new mongoose_1.default.Schema({
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
        type: [{ type: mongoose_1.default.Types.ObjectId, ref: "Tag" }],
        validate: [(val) => val.length <= 10, "tags exceed limit of 10"],
        required: true,
    },
    user: {
        type: mongoose_1.default.Types.ObjectId,
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
const Question = mongoose_1.default.model("Question", questionSchema);
exports.default = Question;
