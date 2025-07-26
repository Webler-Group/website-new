"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const compilerLanguages_1 = __importDefault(require("../config/compilerLanguages"));
const evaluationJobSchema = new mongoose_1.default.Schema({
    language: {
        type: String,
        required: true,
        enum: compilerLanguages_1.default
    },
    source: {
        type: String,
        required: true
    },
    stdin: {
        type: String,
        required: false
    },
    stdout: {
        type: String,
        required: false
    },
    stderr: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ["pending", "running", "done", "error"],
        default: "pending"
    },
    deviceId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});
const EvaluationJob = mongoose_1.default.model("EvaluationJob", evaluationJobSchema);
exports.default = EvaluationJob;
