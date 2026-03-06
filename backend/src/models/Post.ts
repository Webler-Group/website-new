import mongoose, { Document, InferSchemaType, Model } from "mongoose";
import Upvote from "./Upvote";
import Code from "./Code";
import PostFollowing from "./PostFollowing";
import Notification from "./Notification";
import PostAttachment from "./PostAttachment";
import PostTypeEnum from "../data/PostTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import CourseLesson from "./CourseLesson";

const postSchema = new mongoose.Schema({
    _type: {
        type: Number,
        required: true,
        enum: Object.values(PostTypeEnum).map(Number)
    },
    isAccepted: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    codeId: {
        type: mongoose.Types.ObjectId,
        ref: "Code",
        default: null
    },
    feedId: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        default: null
    },
    lessonId: {
        type: mongoose.Types.ObjectId,
        ref: "CourseLesson",
        default: null
    },
    parentId: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
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
    shares: {
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
    try {
        if ((this as any)._messageWasModified) {
            await PostAttachment.updateAttachments(this.message, { post: this._id });
        }
    } catch (err: any) {
        console.log("postSchema.pre(save) failed:", err.message);
    }
});

postSchema.statics.deleteAndCleanup = async function (filter: mongoose.FilterQuery<IPost>, session?: mongoose.mongo.ClientSession) {
    const postsToDelete = await Post.find(filter).select("-message").session(session ?? null);

    for (let i = 0; i < postsToDelete.length; ++i) {
        const post = postsToDelete[i]
        switch (post._type) {
            case PostTypeEnum.QUESTION: {
                await Post.deleteAndCleanup({ parentId: post._id }, session);
                await PostFollowing.deleteMany({ following: post._id }, { session });

                break;
            }
            case PostTypeEnum.ANSWER: {
                const question = await Post.findById(post.parentId).session(session ?? null);
                if (question) {
                    question.$inc("answers", -1);
                    await question.save({ session });
                    await Notification.deleteMany({
                        _type: NotificationTypeEnum.QA_ANSWER,
                        questionId: question._id,
                        postId: post._id
                    }, { session });
                }
                break;
            }
            case PostTypeEnum.CODE_COMMENT: {
                const code = await Code.findById(post.codeId).session(session ?? null);
                if (code) {
                    code.$inc("comments", -1);
                    await code.save({ session });
                    const parentComment = await Post.findById(post.parentId).session(session ?? null);
                    if (parentComment) {
                        parentComment.$inc("answers", -1);
                        await parentComment.save({ session });
                    }
                    await Post.deleteAndCleanup({ parentId: post._id }, session);
                    await Notification.deleteMany({
                        _type: NotificationTypeEnum.CODE_COMMENT,
                        codeId: code._id,
                        postId: post._id
                    }, { session });
                }

                break;
            }

            case PostTypeEnum.FEED: case PostTypeEnum.SHARED_FEED: {
                await Post.deleteAndCleanup({ parentId: post._id, _type: PostTypeEnum.FEED_COMMENT }, session);
                await Notification.deleteMany({
                    feedId: post._id
                }, { session });
                break;
            }

            case PostTypeEnum.FEED_COMMENT: {
                const feed = await Post.findById(post.feedId).session(session ?? null);
                if (feed) {
                    feed.$inc("answers", -1);
                    await feed.save({ session });
                    const parentComment = await Post.findById(post.parentId).session(session ?? null);
                    if (parentComment) {
                        parentComment.$inc("answers", -1);
                        await parentComment.save({ session });
                    }
                    await Post.deleteAndCleanup({ parentId: post._id }, session);
                    await Notification.deleteMany({
                        _type: NotificationTypeEnum.FEED_COMMENT,
                        feedId: feed._id,
                        postId: post._id
                    }, { session });
                }
                break;
            }

            case PostTypeEnum.LESSON_COMMENT: {
                const lesson = await CourseLesson.findById(post.lessonId).session(session ?? null);
                if (lesson) {
                    lesson.$inc("comments", -1);
                    await lesson.save({ session });
                    const parentComment = await Post.findById(post.parentId).session(session ?? null);
                    if (parentComment) {
                        parentComment.$inc("answers", -1);
                        await parentComment.save({ session });
                    }
                    await Post.deleteAndCleanup({ parentId: post._id }, session);
                    await Notification.deleteMany({
                        _type: NotificationTypeEnum.LESSON_COMMENT,
                        lessonId: lesson._id,
                        postId: post._id
                    }, { session });
                }
                break;
            }

        }
        await Upvote.deleteMany({ parentId: post._id }, { session });
        await PostAttachment.deleteMany({ postId: post._id }, { session });
    }

    await Post.deleteMany(filter, { session });
}

declare interface IPost extends InferSchemaType<typeof postSchema> { }

interface PostModel extends Model<IPost> {
    deleteAndCleanup(filter: mongoose.FilterQuery<IPost>, session?: mongoose.mongo.ClientSession): Promise<void>;
}

const Post = mongoose.model<IPost, PostModel>("Post", postSchema);

export type IPostDocument = IPost & Document;

export default Post;