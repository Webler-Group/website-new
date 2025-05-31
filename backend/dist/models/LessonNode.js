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
const QuizAnswer_1 = __importDefault(require("./QuizAnswer"));
const CourseLesson_1 = __importDefault(require("./CourseLesson"));
const lessonNodeSchema = new mongoose_1.default.Schema({
    /*
    * 1 - text
    * 2 - singlechoice question
    * 3 - multichoice question
    * 4 - text question
    */
    _type: {
        type: Number,
        default: 1
    },
    index: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        required: false,
        trim: true,
        minLength: 0,
        maxLength: 1000
    },
    lessonId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "CourseLesson",
        required: true
    },
    correctAnswer: {
        type: String,
        required: false
    }
});
lessonNodeSchema.statics.deleteAndCleanup = function (filter) {
    return __awaiter(this, void 0, void 0, function* () {
        const lessonNodesToDelete = yield LessonNode.find(filter).select("_id");
        for (let i = 0; i < lessonNodesToDelete.length; ++i) {
            const lessonNode = lessonNodesToDelete[i];
            const lesson = yield CourseLesson_1.default.findById(lessonNode.lessonId);
            if (lesson) {
                lesson.$inc("nodes", -1);
                yield lesson.save();
            }
            yield QuizAnswer_1.default.deleteMany({ courseLessonNodeId: lessonNode._id });
        }
        yield LessonNode.deleteMany(filter);
    });
};
const LessonNode = mongoose_1.default.model("LessonNode", lessonNodeSchema);
exports.default = LessonNode;
