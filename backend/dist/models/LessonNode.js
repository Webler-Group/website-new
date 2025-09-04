"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const QuizAnswer_1 = __importDefault(require("./QuizAnswer"));
const CourseLesson_1 = __importDefault(require("./CourseLesson"));
const LessonNodeTypeEnum_1 = __importDefault(require("../data/LessonNodeTypeEnum"));
const lessonNodeSchema = new mongoose_1.default.Schema({
    _type: {
        type: Number,
        default: LessonNodeTypeEnum_1.default.TEXT,
        enum: Object.values(LessonNodeTypeEnum_1.default).map(Number)
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
lessonNodeSchema.statics.deleteAndCleanup = async function (filter) {
    const lessonNodesToDelete = await LessonNode.find(filter).select("_id");
    for (let i = 0; i < lessonNodesToDelete.length; ++i) {
        const lessonNode = lessonNodesToDelete[i];
        const lesson = await CourseLesson_1.default.findById(lessonNode.lessonId);
        if (lesson) {
            lesson.$inc("nodes", -1);
            await lesson.save();
        }
        await QuizAnswer_1.default.deleteMany({ courseLessonNodeId: lessonNode._id });
    }
    await LessonNode.deleteMany(filter);
};
const LessonNode = mongoose_1.default.model("LessonNode", lessonNodeSchema);
exports.default = LessonNode;
