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
const Post_1 = __importDefault(require("./Post"));
const Upvote_1 = __importDefault(require("./Upvote"));
const codeSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
    votes: {
        type: Number,
        default: 0
    },
    comments: {
        type: Number,
        default: 0
    },
    name: {
        type: String,
        trim: true,
        minLength: 1,
        maxLength: 120,
        required: true
    },
    language: {
        type: String,
        required: true,
        enum: compilerLanguages_1.default
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    source: {
        type: String,
        default: ""
    },
    cssSource: {
        type: String,
        default: ""
    },
    jsSource: {
        type: String,
        default: ""
    },
    hidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
codeSchema.statics.deleteAndCleanup = function (codeId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Post_1.default.deleteAndCleanup({ codeId: codeId, parentId: null });
        yield Upvote_1.default.deleteMany({ parentId: codeId });
        yield Code.deleteOne({ _id: codeId });
    });
};
const Code = mongoose_1.default.model("Code", codeSchema);
exports.default = Code;
