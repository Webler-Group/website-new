import mongoose, { InferSchemaType, Model } from "mongoose";
import Upvote from "./Upvote";
import Code from "./Code";
import PostFollowing from "./PostFollowing";
import Notification from "./Notification";
import PostAttachment from "./PostAttachment";

const postSchema = new mongoose.Schema({
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
        type: mongoose.Types.ObjectId,
        ref: "Code",
        default: null
    },
    parentId: {
        type: mongoose.Types.ObjectId,
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
        type: mongoose.Types.ObjectId,
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
        type: [{ type: mongoose.Types.ObjectId, ref: "Tag" }],
        validate: [(val: mongoose.Types.ObjectId[]) => val.length <= 10, "tags exceed limit of 10"]
    },
    hidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

postSchema.pre("save", async function (next) {
    (this as any)._messageWasModified = this.isModified("message");
    next();
});
postSchema.post("save", async function () {
    if ((this as any)._messageWasModified) {
        await PostAttachment.updateAttachments(this.message, { post: this._id });
    }
});

postSchema.statics.deleteAndCleanup = async function (filter: mongoose.FilterQuery<IPost>) {
    const postsToDelete = await Post.find(filter).select("_id _type codeId parentId");

    for (let i = 0; i < postsToDelete.length; ++i) {
        const post = postsToDelete[i]
        switch (post._type) {
            case 1: {
                await Post.deleteAndCleanup({ parentId: post._id });
                await PostFollowing.deleteMany({ following: post._id });
                break;
            }
            case 2: {
                const question = await Post.findById(post.parentId);
                if (question === null) {
                    throw new Error("Question not found");
                }
                question.$inc("answers", -1);
                await question.save();
                await Notification.deleteMany({
                    _type: 201,
                    questionId: question._id,
                    postId: post._id
                })
                break;
            }
            case 3: {
                const code = await Code.findById(post.codeId);
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
                await Notification.deleteMany({
                    _type: 202,
                    codeId: code._id,
                    postId: post._id
                })
                break;
            }
        }
        await Upvote.deleteMany({ parentId: post._id });
        await PostAttachment.deleteMany({ postId: post._id });
    }

    await Post.deleteMany(filter);
}

declare interface IPost extends InferSchemaType<typeof postSchema> { }

interface PostModel extends Model<IPost> {
    deleteAndCleanup(filter: mongoose.FilterQuery<IPost>): Promise<any>;
}

const Post = mongoose.model<IPost, PostModel>("Post", postSchema);

export default Post;