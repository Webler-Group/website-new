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
const compilerLanguages_1 = __importDefault(require("../config/compilerLanguages"));
const evaluationJobSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
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
    }
}, {
    timestamps: true
});
evaluationJobSchema.statics.resetJobs = () => __awaiter(void 0, void 0, void 0, function* () {
    yield EvaluationJob.updateMany({ status: "running" }, { status: "pending" });
});
const EvaluationJob = mongoose_1.default.model("EvaluationJob", evaluationJobSchema);
exports.default = EvaluationJob;
