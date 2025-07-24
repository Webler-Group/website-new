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
    }
});
courseLessonSchema.statics.deleteAndCleanup = function (filter) {
    return __awaiter(this, void 0, void 0, function* () {
        const lessonsToDelete = yield CourseLesson.find(filter).select("_id");
        for (let i = 0; i < lessonsToDelete.length; ++i) {
            const lesson = lessonsToDelete[i];
            yield LessonNode_1.default.deleteAndCleanup({ lessonId: lesson._id });
        }
        yield CourseLesson.deleteMany(filter);
    });
};
const CourseLesson = mongoose_1.default.model("CourseLesson", courseLessonSchema);
exports.default = CourseLesson;
