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
const postAttachmentSchema = new mongoose_1.default.Schema({
    postId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post",
        required: true
    },
    /*
    * 1 - code
    * 2 - question
    */
    _type: {
        type: Number,
        required: true
    },
    code: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Code",
        default: null
    },
    question: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post",
        default: null
    },
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    }
});
postAttachmentSchema.statics.getByPostId = function (postId) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield PostAttachment
            .find({ postId })
            .populate("code", "name language")
            .populate("question", "title")
            .populate("user", "name avatarUrl countryCode level roles");
        return result.map(x => {
            const userDetails = {
                userId: x.user._id,
                userName: x.user.name,
                avatarUrl: x.user.avatarUrl,
                countryCode: x.user.countryCode,
                level: x.user.level,
                roles: x.user.roles
            };
            switch (x._type) {
                case 1: return Object.assign(Object.assign({ id: x._id, type: 1 }, userDetails), { codeId: x.code._id, codeName: x.code.name, codeLanguage: x.code.language });
                case 2: return Object.assign(Object.assign({ id: x._id, type: 2 }, userDetails), { questionId: x.question._id, questionTitle: x.question.title });
            }
            return null;
        })
            .filter(x => x !== null);
    });
};
const PostAttachment = mongoose_1.default.model("PostAttachment", postAttachmentSchema);
exports.default = PostAttachment;
