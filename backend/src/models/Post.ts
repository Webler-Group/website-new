import { prop, getModelForClass, modelOptions, pre, post } from "@typegoose/typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { Types, mongo } from "mongoose";
import PostTypeEnum from "../data/PostTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";

@pre<Post>("save", async function () {
    (this as any)._messageWasModified = this.isModified("message");
})
@post<Post>("save", async function (doc) {
    try {
        if ((doc as any)._messageWasModified) {
            const { default: PostAttachment } = await import("./PostAttachment");
            await PostAttachment.updateAttachments(doc.message, { post: doc._id });
        }
    } catch (err: any) {
        console.log("Post post(save) failed:", err.message);
    }
})
@modelOptions({ schemaOptions: { collection: "posts", timestamps: true } })
export class Post {
    @prop({
        required: true,
        enum: PostTypeEnum,
        type: Number
    })
    _type!: PostTypeEnum;

    @prop({ default: false })
    isAccepted!: boolean;

    @prop({ default: false })
    isPinned!: boolean;

    @prop({ ref: "Code", default: null })
    codeId!: Types.ObjectId | null;

    @prop({ ref: "Post", default: null })
    feedId!: Types.ObjectId | null;

    @prop({ ref: "CourseLesson", default: null })
    lessonId!: Types.ObjectId | null;

    @prop({ ref: "Post", default: null })
    parentId!: Types.ObjectId | null;

    @prop({ required: true, trim: true, minlength: 1, maxlength: 4096 })
    message!: string;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ default: 0 })
    votes!: number;

    @prop({ default: 0 })
    answers!: number;

    @prop({ default: 0 })
    shares!: number;

    @prop({ trim: true, minlength: 1, maxlength: 120 })
    title?: string;

    @prop({
        type: () => [Types.ObjectId],
        ref: "Tag",
        validate: [(val: Types.ObjectId[]) => val.length <= 10, "tags exceed limit of 10"]
    })
    tags!: Types.ObjectId[];

    @prop({ default: false })
    hidden!: boolean;

    // --- Static ---
    static async deleteAndCleanup(
        this: ModelType<Post>,
        filter: Record<string, any>,
        session?: mongo.ClientSession
    ): Promise<void> {
        const { default: Upvote } = await import("./Upvote");
        const { default: PostAttachment } = await import("./PostAttachment");
        const { default: PostFollowing } = await import("./PostFollowing");
        const { default: Code } = await import("./Code");
        const { default: Notification } = await import("./Notification");
        const { default: CourseLesson } = await import("./CourseLesson");

        const postsToDelete = await PostModel.find(filter, { message: 0 }).lean().session(session ?? null);

        for (const post of postsToDelete) {
            switch (post._type) {
                case PostTypeEnum.QUESTION: {
                    await PostModel.deleteAndCleanup({ parentId: post._id }, session);
                    await PostFollowing.deleteMany({ following: post._id }, { session });
                    break;
                }
                case PostTypeEnum.ANSWER: {
                    const question = await PostModel.findById(post.parentId).session(session ?? null);
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
                        const parentComment = await PostModel.findById(post.parentId).session(session ?? null);
                        if (parentComment) {
                            parentComment.$inc("answers", -1);
                            await parentComment.save({ session });
                        }
                        await PostModel.deleteAndCleanup({ parentId: post._id }, session);
                        await Notification.deleteMany({
                            _type: NotificationTypeEnum.CODE_COMMENT,
                            codeId: code._id,
                            postId: post._id
                        }, { session });
                    }
                    break;
                }
                case PostTypeEnum.FEED:
                case PostTypeEnum.SHARED_FEED: {
                    await PostModel.deleteAndCleanup({ parentId: post._id, _type: PostTypeEnum.FEED_COMMENT }, session);
                    await Notification.deleteMany({ feedId: post._id }, { session });
                    break;
                }
                case PostTypeEnum.FEED_COMMENT: {
                    const feed = await PostModel.findById(post.feedId).session(session ?? null);
                    if (feed) {
                        feed.$inc("answers", -1);
                        await feed.save({ session });
                        const parentComment = await PostModel.findById(post.parentId).session(session ?? null);
                        if (parentComment) {
                            parentComment.$inc("answers", -1);
                            await parentComment.save({ session });
                        }
                        await PostModel.deleteAndCleanup({ parentId: post._id }, session);
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
                        const parentComment = await PostModel.findById(post.parentId).session(session ?? null);
                        if (parentComment) {
                            parentComment.$inc("answers", -1);
                            await parentComment.save({ session });
                        }
                        await PostModel.deleteAndCleanup({ parentId: post._id }, session);
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

        await PostModel.deleteMany(filter, { session });
    }
}

const PostModel = getModelForClass(Post);
export default PostModel;