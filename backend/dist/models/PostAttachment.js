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
const Post_1 = __importDefault(require("./Post"));
const Code_1 = __importDefault(require("./Code"));
const confg_1 = require("../confg");
const postAttachmentSchema = new mongoose_1.default.Schema({
    postId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post",
        default: null
    },
    channelMessageId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "ChannelMessage",
        default: null
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
postAttachmentSchema.statics.getByPostId = function (id) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield PostAttachment
            .find({ postId: (_a = id.post) !== null && _a !== void 0 ? _a : null, channelMessageId: (_b = id.channelMessage) !== null && _b !== void 0 ? _b : null })
            .populate("code", "name language")
            .populate("question", "title")
            .populate("user", "name avatarImage countryCode level roles");
        return result.map(x => {
            const userDetails = {
                userId: x.user._id,
                userName: x.user.name,
                userAvatar: x.user.avatarImage,
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
postAttachmentSchema.statics.updateAttachments = function (message, id) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        const currentAttachments = yield PostAttachment
            .find({ postId: (_a = id.post) !== null && _a !== void 0 ? _a : null, channelMessageId: (_b = id.channelMessage) !== null && _b !== void 0 ? _b : null });
        const newAttachmentIds = [];
        const pattern = new RegExp("(" + confg_1.config.allowedOrigins.join("|") + ")\/([\\w\-]+)\/([\\w\-]+)", "gi");
        const matches = message.matchAll(pattern);
        for (let match of matches) {
            if (match.length < 4)
                continue;
            let attachment = null;
            switch (match[2]) {
                case "Compiler-Playground": {
                    const codeId = match[3];
                    try {
                        const code = yield Code_1.default.findById(codeId);
                        if (!code) {
                            continue;
                        }
                        attachment = currentAttachments.find(x => x.code && x.code == codeId);
                        if (!attachment) {
                            attachment = yield PostAttachment.create({
                                postId: (_c = id.post) !== null && _c !== void 0 ? _c : null,
                                channelMessageId: (_d = id.channelMessage) !== null && _d !== void 0 ? _d : null,
                                _type: 1,
                                code: codeId,
                                user: code.user
                            });
                        }
                    }
                    catch (err) {
                        console.log(err === null || err === void 0 ? void 0 : err.message);
                    }
                    break;
                }
                case "Discuss": {
                    const questionId = match[3];
                    try {
                        const question = yield Post_1.default.findById(questionId);
                        if (!question) {
                            continue;
                        }
                        attachment = currentAttachments.find(x => x.question && x.question == questionId);
                        if (!attachment) {
                            attachment = yield PostAttachment.create({
                                postId: (_e = id.post) !== null && _e !== void 0 ? _e : null,
                                channelMessageId: (_f = id.channelMessage) !== null && _f !== void 0 ? _f : null,
                                _type: 2,
                                question: questionId,
                                user: question.user
                            });
                        }
                    }
                    catch (err) {
                        console.log(err === null || err === void 0 ? void 0 : err.message);
                    }
                    break;
                }
            }
            if (attachment) {
                newAttachmentIds.push(attachment._id.toString());
            }
        }
        const idsToDelete = currentAttachments.map(x => x._id)
            .filter(v => !newAttachmentIds.includes(v.toString()));
        yield PostAttachment.deleteMany({
            _id: { $in: idsToDelete }
        });
    });
};
const PostAttachment = mongoose_1.default.model("PostAttachment", postAttachmentSchema);
exports.default = PostAttachment;
