"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const LessonNode_1 = __importDefault(require("./LessonNode"));
const CourseLesson_1 = __importDefault(require("./CourseLesson"));
const courseProgressSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
        type: mongoose_1.Types.ObjectId,
        ref: "Course",
        required: true
    },
    lastLessonNodeId: {
        type: mongoose_1.Types.ObjectId,
        ref: "LessonNode",
        default: null
    },
    nodesSolved: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
courseProgressSchema.pre("save", async function (next) {
    if (this.isModified("nodesSolved")) {
        const lessonIds = (await CourseLesson_1.default.find({ course: this.course }, "_id")).map(x => x._id);
        const courseNodes = await LessonNode_1.default.count({ lessonId: { $in: lessonIds } });
        if (courseNodes === this.nodesSolved) {
            this.completed = true;
        }
    }
    return next();
});
courseProgressSchema.methods.getLastUnlockedLessonIndex = async function () {
    let lastUnlockedLessonIndex = 1;
    if (this.lastLessonNodeId) {
        const lastCompletedLessonNode = await LessonNode_1.default.findById(this.lastLessonNodeId)
            .select("index")
            .populate("lessonId", "nodes index");
        if (lastCompletedLessonNode) {
            lastUnlockedLessonIndex = lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index ?
                lastCompletedLessonNode.lessonId.index + 1 :
                lastCompletedLessonNode.lessonId.index;
        }
    }
    return lastUnlockedLessonIndex;
};
courseProgressSchema.methods.getLessonNodeInfo = async function (lessonNodeId) {
    const lessonNode = await LessonNode_1.default.findById(lessonNodeId)
        .select("index")
        .populate("lessonId", "nodes index");
    const result = {
        unlocked: false,
        isLastUnlocked: false
    };
    if (!lessonNode)
        return result;
    const lessonIndex = lessonNode.lessonId.index;
    let lastCompletedLessonNode = null;
    if (this.lastLessonNodeId) {
        lastCompletedLessonNode = await LessonNode_1.default.findById(this.lastLessonNodeId)
            .select("index")
            .populate("lessonId", "nodes index");
    }
    if (lastCompletedLessonNode) {
        const lastUnlockedLessonIndex = lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index ?
            lastCompletedLessonNode.lessonId.index + 1 :
            lastCompletedLessonNode.lessonId.index;
        if (lessonIndex < lastUnlockedLessonIndex) {
            result.unlocked = true;
        }
        else if (lessonIndex == lastUnlockedLessonIndex) {
            if (lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index) {
                result.unlocked = lessonNode.index == 1;
                result.isLastUnlocked = result.unlocked;
            }
            else {
                result.unlocked = lessonNode.index <= lastCompletedLessonNode.index + 1;
                result.isLastUnlocked = lessonNode.index == lastCompletedLessonNode.index + 1;
            }
        }
    }
    else {
        result.unlocked = lessonNode.index == 1 && lessonIndex == 1;
        result.isLastUnlocked = result.unlocked;
    }
    return result;
};
const CourseProgress = mongoose_1.default.model("CourseProgress", courseProgressSchema);
exports.default = CourseProgress;
