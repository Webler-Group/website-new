"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        maxLength: 20,
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
        type: String,
        required: false
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
courseSchema.statics.deleteAndCleanup = function (courseId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield CourseLesson_1.default.deleteAndCleanup({ course: courseId });
        yield CourseProgress_1.default.deleteMany({ course: courseId });
        yield Course.deleteOne({ _id: courseId });
    });
};
const Course = mongoose_1.default.model("Course", courseSchema);
exports.default = Course;
