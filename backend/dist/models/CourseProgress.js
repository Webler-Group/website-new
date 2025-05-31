"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const courseProgressSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
    courseId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Course",
        required: true
    },
    lastLessonNodeId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "LessonNode",
        default: null
    },
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
const CourseProgress = mongoose_1.default.model("CourseProgress", courseProgressSchema);
exports.default = CourseProgress;
