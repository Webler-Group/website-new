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
        maxLength: 1000
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
}, {
    timestamps: true
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
        }
        yield Post.deleteMany(filter);
    });
};
const Post = mongoose_1.default.model("Post", postSchema);
exports.default = Post;
