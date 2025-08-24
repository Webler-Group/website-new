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
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
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
    const lessonIndex = lessonNode.lessonId.index;
    let unlocked = false;
    let isLast = false;
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
            unlocked = true;
        }
        else if (lessonIndex == lastUnlockedLessonIndex) {
            if (lastCompletedLessonNode.lessonId.nodes == lastCompletedLessonNode.index) {
                unlocked = lessonNode.index == 1;
                isLast = unlocked;
            }
            else {
                unlocked = lessonNode.index <= lastCompletedLessonNode.index + 1;
                isLast = lessonNode.index == lastCompletedLessonNode.index + 1;
            }
        }
    }
    else {
        unlocked = lessonNode.index == 1 && lessonIndex == 1;
        isLast = unlocked;
    }
    return {
        unlocked,
        isLast
    };
};
const CourseProgress = mongoose_1.default.model("CourseProgress", courseProgressSchema);
exports.default = CourseProgress;
