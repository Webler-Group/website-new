"use strict";
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
postAttachmentSchema.statics.getByPostId = async function (id) {
    const result = await PostAttachment
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null })
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
            case 1:
                if (!x.code)
                    return null;
                return {
                    id: x._id,
                    type: 1,
                    ...userDetails,
                    codeId: x.code._id,
                    codeName: x.code.name,
                    codeLanguage: x.code.language
                };
            case 2:
                if (!x.question)
                    return null;
                return {
                    id: x._id,
                    type: 2,
                    ...userDetails,
                    questionId: x.question._id,
                    questionTitle: x.question.title
                };
        }
        return null;
    })
        .filter(x => x !== null);
};
postAttachmentSchema.statics.updateAttachments = async function (message, id) {
    const currentAttachments = await PostAttachment
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null });
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
                    const code = await Code_1.default.findById(codeId);
                    if (!code) {
                        continue;
                    }
                    attachment = currentAttachments.find(x => x.code && x.code == codeId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: id.post ?? null,
                            channelMessageId: id.channelMessage ?? null,
                            _type: 1,
                            code: codeId,
                            user: code.user
                        });
                    }
                }
                catch (err) {
                    console.log(err?.message);
                }
                break;
            }
            case "Discuss": {
                const questionId = match[3];
                try {
                    const question = await Post_1.default.findById(questionId);
                    if (!question) {
                        continue;
                    }
                    attachment = currentAttachments.find(x => x.question && x.question == questionId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: id.post ?? null,
                            channelMessageId: id.channelMessage ?? null,
                            _type: 2,
                            question: questionId,
                            user: question.user
                        });
                    }
                }
                catch (err) {
                    console.log(err?.message);
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
    await PostAttachment.deleteMany({
        _id: { $in: idsToDelete }
    });
};
const PostAttachment = mongoose_1.default.model("PostAttachment", postAttachmentSchema);
exports.default = PostAttachment;
