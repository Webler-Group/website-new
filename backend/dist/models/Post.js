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
const Upvote_1 = __importDefault(require("./Upvote"));
const Code_1 = __importDefault(require("./Code"));
const PostFollowing_1 = __importDefault(require("./PostFollowing"));
const Notification_1 = __importDefault(require("./Notification"));
const PostAttachment_1 = __importDefault(require("./PostAttachment"));
const confg_1 = require("../confg");
const postSchema = new mongoose_1.default.Schema({
    /*
    * 1 - question
    * 2 - answer
    * 3 - comment
    */
    _type: {
        type: Number,
        required: true
    },
    isAccepted: {
        type: Boolean,
        default: false
    },
    codeId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Code",
        default: null
    },
    parentId: {
        type: mongoose_1.default.Types.ObjectId,
        default: null
    },
    message: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 4096
    },
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
    votes: {
        type: Number,
        default: 0
    },
    answers: {
        type: Number,
        default: 0
    },
    title: {
        type: String,
        trim: true,
        minLength: 1,
        maxLength: 120
    },
    tags: {
        type: [{ type: mongoose_1.default.Types.ObjectId, ref: "Tag" }],
        validate: [(val) => val.length <= 10, "tags exceed limit of 10"]
    },
    hidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});
postSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified("message")) {
            next();
        }
        const currentAttachments = yield PostAttachment_1.default
            .find({ postId: this._id })
            .select("_type codeId questionId");
        const newAttachmentIds = [];
        const pattern = new RegExp(confg_1.config.homeUrl + "([\\w\-]+)\/([\\w\-]+)", "gi");
        const matches = this.message.matchAll(pattern);
        for (let match of matches) {
            let attachment = null;
            switch (match[1]) {
                case "Compiler-Playground": {
                    const codeId = match[2];
                    try {
                        const code = yield Code_1.default.findById(codeId);
                        if (!code) {
                            continue;
                        }
                        attachment = currentAttachments.find(x => x.code && x.code.toString() === codeId);
                        if (!attachment) {
                            attachment = yield PostAttachment_1.default.create({
                                postId: this._id,
                                _type: 1,
                                code: codeId,
                                user: code.user
                            });
                        }
                    }
                    catch (_a) { }
                    break;
                }
                case "Discuss": {
                    const questionId = match[2];
                    try {
                        const question = yield Post.findById(questionId);
                        if (!question) {
                            continue;
                        }
                        attachment = currentAttachments.find(x => x.question && x.question.toString() === questionId);
                        if (!attachment) {
                            attachment = yield PostAttachment_1.default.create({
                                postId: this._id,
                                _type: 2,
                                question: questionId,
                                user: question.user
                            });
                        }
                    }
                    catch (_b) { }
                    break;
                }
            }
            if (attachment) {
                newAttachmentIds.push(attachment._id);
            }
        }
        const idsToDelete = currentAttachments.map(x => x._id)
            .filter(id => !newAttachmentIds.includes(id));
        yield PostAttachment_1.default.deleteMany({
            _id: { $in: idsToDelete }
        });
    });
});
postSchema.statics.deleteAndCleanup = function (filter) {
    return __awaiter(this, void 0, void 0, function* () {
        const postsToDelete = yield Post.find(filter).select("_id _type codeId parentId");
        for (let i = 0; i < postsToDelete.length; ++i) {
            const post = postsToDelete[i];
            switch (post._type) {
                case 1: {
                    yield Post.deleteAndCleanup({ parentId: post._id });
                    yield PostFollowing_1.default.deleteMany({ following: post._id });
                    break;
                }
                case 2: {
                    const question = yield Post.findById(post.parentId);
                    if (question === null) {
                        throw new Error("Question not found");
                    }
                    question.$inc("answers", -1);
                    yield question.save();
                    yield Notification_1.default.deleteMany({
                        _type: 201,
                        questionId: question._id,
                        postId: post._id
                    });
                    break;
                }
                case 3: {
                    const code = yield Code_1.default.findById(post.codeId);
                    if (code === null) {
                        throw new Error("Code not found");
                    }
                    code.$inc("comments", -1);
                    yield code.save();
                    const parentComment = yield Post.findById(post.parentId);
                    if (parentComment) {
                        parentComment.$inc("answers", -1);
                        yield parentComment.save();
                    }
                    else {
                        yield Post.deleteAndCleanup({ parentId: post._id });
                    }
                    yield Notification_1.default.deleteMany({
                        _type: 202,
                        codeId: code._id,
                        postId: post._id
                    });
                    break;
                }
            }
            yield Upvote_1.default.deleteMany({ parentId: post._id });
            yield PostAttachment_1.default.deleteMany({ postId: post._id });
        }
        yield Post.deleteMany(filter);
    });
};
const Post = mongoose_1.default.model("Post", postSchema);
exports.default = Post;
