"use strict";
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
postSchema.pre("save", async function (next) {
    if (!this.isModified("message")) {
        next();
        return;
    }
    await PostAttachment_1.default.updateAttachments(this.message, { post: this._id });
});
postSchema.statics.deleteAndCleanup = async function (filter) {
    const postsToDelete = await Post.find(filter).select("_id _type codeId parentId");
    for (let i = 0; i < postsToDelete.length; ++i) {
        const post = postsToDelete[i];
        switch (post._type) {
            case 1: {
                await Post.deleteAndCleanup({ parentId: post._id });
                await PostFollowing_1.default.deleteMany({ following: post._id });
                break;
            }
            case 2: {
                const question = await Post.findById(post.parentId);
                if (question === null) {
                    throw new Error("Question not found");
                }
                question.$inc("answers", -1);
                await question.save();
                await Notification_1.default.deleteMany({
                    _type: 201,
                    questionId: question._id,
                    postId: post._id
                });
                break;
            }
            case 3: {
                const code = await Code_1.default.findById(post.codeId);
                if (code === null) {
                    throw new Error("Code not found");
                }
                code.$inc("comments", -1);
                await code.save();
                const parentComment = await Post.findById(post.parentId);
                if (parentComment) {
                    parentComment.$inc("answers", -1);
                    await parentComment.save();
                }
                else {
                    await Post.deleteAndCleanup({ parentId: post._id });
                }
                await Notification_1.default.deleteMany({
                    _type: 202,
                    codeId: code._id,
                    postId: post._id
                });
                break;
            }
        }
        await Upvote_1.default.deleteMany({ parentId: post._id });
        await PostAttachment_1.default.deleteMany({ postId: post._id });
    }
    await Post.deleteMany(filter);
};
const Post = mongoose_1.default.model("Post", postSchema);
exports.default = Post;
