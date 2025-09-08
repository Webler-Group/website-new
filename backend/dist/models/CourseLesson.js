"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const LessonNode_1 = __importDefault(require("./LessonNode"));
const courseLessonSchema = new mongoose_1.default.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    index: {
        type: Number,
        required: true
    },
    course: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Course",
        required: true
    },
    nodes: {
        type: Number,
        default: 0
    },
    comments: {
        type: Number,
        default: 0
    }
});
courseLessonSchema.statics.deleteAndCleanup = async function (filter) {
    const lessonsToDelete = await CourseLesson.find(filter).select("_id");
    for (let i = 0; i < lessonsToDelete.length; ++i) {
        const lesson = lessonsToDelete[i];
        await LessonNode_1.default.deleteAndCleanup({ lessonId: lesson._id });
    }
    await CourseLesson.deleteMany(filter);
};
const CourseLesson = mongoose_1.default.model("CourseLesson", courseLessonSchema);
exports.default = CourseLesson;
