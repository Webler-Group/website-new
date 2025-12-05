"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CompilerLanguagesEnum_1 = __importDefault(require("../data/CompilerLanguagesEnum"));
const evaluationJobSchema = new mongoose_1.default.Schema({
    language: {
        type: String,
        required: true,
        enum: Object.values(CompilerLanguagesEnum_1.default)
    },
    source: {
        type: String,
        required: true
    },
    stdin: {
        type: [String]
    },
    result: {
        type: {
            compileErr: { type: String, required: false },
            runResults: [{
                    stdout: { type: String, default: "" },
                    stderr: { type: String, default: "" },
                    time: { type: Number, reqired: false }
                }]
        }
    },
    status: {
        type: String,
        enum: ["pending", "running", "done", "error"],
        default: "pending"
    },
    deviceId: {
        type: String,
        required: true
    },
    challenge: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Challenge",
        default: null
    },
    submission: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "ChallengeSubmission",
        default: null
    },
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        default: null
    },
}, {
    timestamps: true
});
const EvaluationJob = mongoose_1.default.model("EvaluationJob", evaluationJobSchema);
exports.default = EvaluationJob;
