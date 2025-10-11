"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CompilerLanguagesEnum_1 = __importDefault(require("../data/CompilerLanguagesEnum"));
const challengeSubmissionSchema = new mongoose_1.Schema({
    challenge: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Challenge",
        required: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    language: {
        type: String,
        enum: Object.values(CompilerLanguagesEnum_1.default),
        required: true
    },
    testResults: [{
            passed: {
                type: Boolean,
                required: true
            },
            output: {
                type: String,
                required: false
            },
            stderr: {
                type: String,
                required: false
            },
            time: {
                type: Number,
                required: false
            }
        }],
    passed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
const ChallengeSubmission = (0, mongoose_1.model)("ChallengeSubmission", challengeSubmissionSchema);
exports.default = ChallengeSubmission;
