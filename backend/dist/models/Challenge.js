"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ChallengeDifficultyEnum_1 = __importDefault(require("../data/ChallengeDifficultyEnum"));
const CompilerLanguagesEnum_1 = __importDefault(require("../data/CompilerLanguagesEnum"));
const challengeSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxLength: 4096,
        minLength: 1
    },
    difficulty: {
        type: String,
        enum: Object.values(ChallengeDifficultyEnum_1.default),
        default: ChallengeDifficultyEnum_1.default.EASY
    },
    testCases: [{
            input: {
                type: String,
                required: true,
                minLength: 1,
                maxLength: 500
            },
            expectedOutput: {
                type: String,
                required: true,
                minLength: 1,
                maxLength: 500
            },
            isHidden: {
                type: Boolean,
                default: true
            }
        }],
    templates: [{
            name: {
                type: String,
                required: true,
                enum: Object.values(CompilerLanguagesEnum_1.default)
            },
            source: {
                type: String,
                required: true
            }
        }],
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
}, { timestamps: true });
challengeSchema.statics.deleteAndCleanup = async function (filter) {
    const challengesToDelete = await Challenge.find(filter).select("_id");
    for (let i = 0; i < challengesToDelete.length; ++i) {
        const challege = challengesToDelete[i];
    }
};
const Challenge = (0, mongoose_1.model)("Challenge", challengeSchema);
exports.default = Challenge;
