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
        maxLength: 1000
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
}, {
    timestamps: true
});

postSchema.pre("save", async function (next) {
    if (!this.isModified("message")) {
        next();
    }

    const currentAttachments = await PostAttachment
        .find({ postId: this._id })
        .select("_type codeId questionId") as any[];

    const newAttachmentIds: string[] = [];

    const pattern = new RegExp(process.env.HOME_URL + "([\\w\-]+)\/([\\w\-]+)", "gi");
    const matches = this.message.matchAll(pattern);

    for (let match of matches) {

        let attachment = null;
        switch (match[1]) {
            case "Compiler-Playground": {
                const codeId = match[2];
                try {
                    const code = await Code.findById(codeId);
                    if (!code) {
                        continue
                    }

                    attachment = currentAttachments.find(x => x.code && x.code.toString() === codeId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: this._id,
                            _type: 1,
                            code: codeId,
                            user: code.user
                        })

                    }
                }
                catch { }
                break;
            }
            case "Discuss": {
                const questionId = match[2];
                try {
                    const question = await Post.findById(questionId);
                    if (!question) {
                        continue
                    }

                    attachment = currentAttachments.find(x => x.question && x.question.toString() === questionId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: this._id,
                            _type: 2,
                            question: questionId,
                            user: question.user
                        })
                    }
                }
                catch { }
                break;
            }
        }
        if (attachment) {
            newAttachmentIds.push(attachment._id)
        }
    }

    const idsToDelete = currentAttachments.map(x => x._id)
        .filter(id => !newAttachmentIds.includes(id))

    await PostAttachment.deleteMany({
        _id: { $in: idsToDelete }
    });

})

postSchema.statics.deleteAndCleanup = async function (filter: any) {
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
    deleteAndCleanup(filter: any): Promise<any>;
}

const Post = mongoose.model<IPost, PostModel>("Post", postSchema);

export default Post;