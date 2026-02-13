"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CourseLesson_1 = __importDefault(require("./CourseLesson"));
const CourseProgress_1 = __importDefault(require("./CourseProgress"));
const courseSchema = new mongoose_1.default.Schema({
    code: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true,
        maxLength: 64,
        minLength: 1,
        validate: [(val) => val.match(new RegExp("^([a-z]+-)*[a-z]+$", "i")) !== null, 'Course code can only contain words separated by "-"']
    },
    title: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    coverImage: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "File",
        default: null
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1000
    },
    visible: {
        type: Boolean,
        default: false
    }
});
courseSchema.statics.deleteAndCleanup = async function (courseId) {
    await CourseLesson_1.default.deleteAndCleanup({ course: courseId });
    await CourseProgress_1.default.deleteMany({ course: courseId });
    await Course.deleteOne({ _id: courseId });
};
const Course = mongoose_1.default.model("Course", courseSchema);
exports.default = Course;
