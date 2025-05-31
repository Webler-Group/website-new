"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const quizAnswerSchema = new mongoose_1.default.Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    correct: {
        type: Boolean,
        default: false
    },
    courseLessonNodeId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "LessonNode",
        default: null
    }
});
const QuizAnswer = mongoose_1.default.model("QuizAnswer", quizAnswerSchema);
exports.default = QuizAnswer;
