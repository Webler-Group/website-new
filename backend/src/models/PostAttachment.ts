import mongoose, { InferSchemaType, Model } from "mongoose";
import Post from "./Post";
import Code from "./Code";
import { config } from "../confg";
import { escapeRegex } from "../utils/regexUtils";
import User from "./User";
import Notification from "./Notification";
import { sendToUsers } from "../services/pushService";
import { truncate } from "../utils/StringUtils";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import PostTypeEnum from "../data/PostTypeEnum";
import PostAttachmentTypeEnum from "../data/PostAttachmentTypeEnum";

const postAttachmentSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        default: null
    },
    channelMessageId: {
        type: mongoose.Types.ObjectId,
        ref: "ChannelMessage",
        default: null
    },
    _type: {
        type: Number,
        required: true,
        enum: Object.values(PostAttachmentTypeEnum).map(Number)
    },
    code: { // attached code
        type: mongoose.Types.ObjectId,
        ref: "Code",
        default: null
    },
    question: { // attached question
        type: mongoose.Types.ObjectId,
        ref: "Post",
        default: null
    },
    feed: {
        type: mongoose.Types.ObjectId,
        ref: "Post",
        default: null
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    }
})

postAttachmentSchema.post("save", async function () {
    if (this._type == PostAttachmentTypeEnum.MENTION && this.postId) {
        try {
            const post = await Post.findById(this.postId, "-message")
                .populate<{ user: any }>("user", "name")
                .populate<{ codeId: any }>("codeId", "name")
                .populate<{ parentId: any }>("parentId", "title")
                .populate<{ lessonId: any }>({
                    path: "lessonId",
                    select: "course title",
                    populate: {
                        path: "course",
                        select: "code title"
                    }
                })
                .populate<{ feedId: any }>("feedId", "message")
                .lean();
            if (!post || this.user == post.user._id) return;

            switch (post._type) {
                case PostTypeEnum.QUESTION:
                    await sendToUsers([this.user.toString()], {
                        title: "New mention",
                        body: `${post.user.name} mentioned you in question "${post.title}"`
                    }, "mentions");
                    await Notification.create({
                        _type: NotificationTypeEnum.QA_QUESTION_MENTION,
                        user: this.user,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in question "${post.title}"`,
                        questionId: post._id
                    });
                    break;
                case PostTypeEnum.ANSWER:
                    await sendToUsers([this.user.toString()], {
                        title: "New mention",
                        body: `${post.user.name} mentioned you in answer to question "${post.parentId?.title}"`
                    }, "mentions");
                    await Notification.create({
                        _type: NotificationTypeEnum.QA_ANSWER_MENTION,
                        user: this.user,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in answer to question "${post.parentId?.title}"`,
                        questionId: post.parentId?._id,
                        postId: post._id
                    })
                    break;
                case PostTypeEnum.CODE_COMMENT:
                    await sendToUsers([this.user.toString()], {
                        title: "New mention",
                        body: `${post.user.name} mentioned you in comment to code "${post.codeId?.name}"`
                    }, "mentions");
                    await Notification.create({
                        _type: NotificationTypeEnum.CODE_COMMENT_MENTION,
                        user: this.user,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment to code "${post.codeId?.name}"`,
                        codeId: post.codeId?._id,
                        postId: post._id
                    })
                    break;
                case PostTypeEnum.LESSON_COMMENT:
                    await sendToUsers([this.user.toString()], {
                        title: "New mention",
                        body: `${post.user.name} mentioned you in comment on lesson "${post.lessonId?.title}" to ${post.lessonId?.course.title}`
                    }, "mentions");
                    await Notification.create({
                        _type: NotificationTypeEnum.LESSON_COMMENT_MENTION,
                        user: this.user,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment on lesson "${post.lessonId?.title}" to ${post.lessonId?.course.title}`,
                        lessonId: post.lessonId?._id,
                        postId: post._id,
                        courseCode: post.lessonId.course.code
                    })
                    break;
                case PostTypeEnum.FEED_COMMENT:
                    await sendToUsers([this.user.toString()], {
                        title: "New mention",
                        body: `${post.user.name} mentioned you in comment to post "${truncate(post.feedId?.message, 20)}"`
                    }, "mentions");
                    await Notification.create({
                        _type: NotificationTypeEnum.FEED_COMMENT_MENTION,
                        user: this.user,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment to post "${truncate(post.feedId?.message, 20)}"`,
                        feedId: post.feedId?._id,
                        postId: post._id
                    })
                    break;
            }
        } catch (err: any) {
            console.log("Error creating notifcations for post attachments:", err);

        }
    }
});

// --- DELETE MANY ---
postAttachmentSchema.pre("deleteMany", { document: false, query: true }, async function (next) {
    try {
        const filter = this.getFilter();
        const docs = await this.model.find(filter).where({ _type: PostAttachmentTypeEnum.MENTION });
        (this as any)._docsToDelete = docs;
    } catch (err) {
        console.log("Error in postAttachmentSchema.pre(deleteMany):", err);
    } finally {
        next();
    }
});

postAttachmentSchema.post("deleteMany", { document: false, query: true }, async function () {
    const docs = (this as any)._docsToDelete as any[];
    if (!docs || docs.length === 0) return;

    for (let doc of docs) {
        try {
            if (!doc.postId) continue;

            const post = await Post.findById(doc.postId, "-message");
            if (!post) continue;

            let filter: any = {
                user: doc.user,
                actionUser: post.user,
            };

            switch (post._type) {
                case PostTypeEnum.QUESTION:
                    filter._type = NotificationTypeEnum.QA_QUESTION_MENTION;
                    filter.questionId = post._id;
                    break;
                case PostTypeEnum.ANSWER:
                    filter._type = NotificationTypeEnum.QA_ANSWER_MENTION;
                    filter.questionId = post.parentId;
                    filter.postId = post._id;
                    break;
                case PostTypeEnum.CODE_COMMENT:
                    filter._type = NotificationTypeEnum.CODE_COMMENT_MENTION;
                    filter.codeId = post.codeId;
                    filter.postId = post._id;
                    break;
                case PostTypeEnum.LESSON_COMMENT:
                    filter._type = NotificationTypeEnum.LESSON_COMMENT_MENTION;
                    filter.lessonId = post.lessonId;
                    filter.postId = post._id;
                    break;
                case PostTypeEnum.FEED_COMMENT:
                    filter._type = NotificationTypeEnum.FEED_COMMENT_MENTION;
                    filter.feedId = post.feedId;
                    filter.postId = post._id;
                    break;
                default:
                    continue;
            }

            await Notification.deleteMany(filter);
        } catch (err) {
            console.log("Error deleting notification for PostAttachment:", err);
        }
    }
});


postAttachmentSchema.statics.getByPostId = async function (id: { post?: mongoose.Types.ObjectId; channelMessage?: mongoose.Types.ObjectId; }) {
    const result = await PostAttachment
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null, _type: { $ne: PostAttachmentTypeEnum.MENTION } })
        .populate("code", "name language")
        .populate("question", "title")
        .populate("feed")
        .populate("user", "name avatarImage countryCode level roles") as any[];
    return result.map((x) => {
        const userDetails = {
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles
        }
        switch (x._type) {
            case PostAttachmentTypeEnum.CODE:
                if (!x.code) return null;
                return {
                    id: x._id,
                    type: x._type,
                    ...userDetails,
                    codeId: x.code._id,
                    codeName: x.code.name,
                    codeLanguage: x.code.language
                }
            case PostAttachmentTypeEnum.QUESTION:
                if (!x.question) return null;
                return {
                    id: x._id,
                    type: x._type,
                    ...userDetails,
                    questionId: x.question._id,
                    questionTitle: x.question.title
                }
            case PostAttachmentTypeEnum.FEED:
                if (!x.feed) return null;
                return {
                    id: x._id,
                    type: x._type,
                    ...userDetails,
                    feedId: x.feed._id,
                    feedMessage: truncate(x.feed.message, 120),
                    feedType: x.feed._type
                }

        }
        return null
    })
        .filter(x => x !== null)
}

postAttachmentSchema.statics.updateAttachments = async function (message: string, id: { post?: mongoose.Types.ObjectId; channelMessage?: mongoose.Types.ObjectId; }) {
    const currentAttachments = await PostAttachment
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null });
    const newAttachmentIds: string[] = [];
    const pattern = new RegExp("(" + config.allowedOrigins.map(x => escapeRegex(x)).join("|") + ")\/([\\w\-]+)\/([\\w\-]+)", "gi")
    const matches = message.matchAll(pattern);
    for (let match of matches) {
        if (match.length < 4) continue;
        let attachment = null;
        switch (match[2].toLowerCase()) {
            case "compiler-playground": {
                const codeId = match[3];
                try {
                    const code = await Code.findById(codeId);
                    if (!code) {
                        continue
                    }
                    attachment = currentAttachments.find(x => x.code && x.code == codeId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: id.post ?? null,
                            channelMessageId: id.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.CODE,
                            code: codeId,
                            user: code.user
                        })
                    }
                }
                catch (err: any) {
                    console.log(err?.message);
                }
                break;
            }
            case "discuss": {
                const questionId = match[3];
                try {
                    const question = await Post.findById(questionId);
                    if (!question) {
                        continue
                    }
                    attachment = currentAttachments.find(x => x.question && x.question == questionId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: id.post ?? null,
                            channelMessageId: id.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.QUESTION,
                            question: questionId,
                            user: question.user
                        })
                    }
                }
                catch (err: any) {
                    console.log(err?.message);
                }
                break;
            }
            case "feed": {
                const postId = match[3];
                try {
                    const post = await Post.findById(postId);
                    if (!post) continue;

                    if (post._type !== PostTypeEnum.FEED && post._type !== PostTypeEnum.SHARED_FEED) continue;

                    attachment = currentAttachments.find(x => x.feed && x.feed == postId);
                    if (!attachment) {
                        attachment = await PostAttachment.create({
                            postId: id.post ?? null,
                            channelMessageId: id.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.FEED,
                            feed: postId,
                            user: post.user
                        });
                    }
                } catch (err: any) {
                    console.log(err?.message);
                }
                break;
            }

        }
        if (attachment) {
            newAttachmentIds.push(attachment._id.toString());
        }
    }
    const userPattern = /\[user id="([0-9a-fA-F]{24})"\](.+?)\[\/user\]/gi;
    const userMatches = message.matchAll(userPattern);
    for (let match of userMatches) {
        let attachment = null;
        const userid = match[1];
        try {
            const mentionedUser = await User.findById(userid);
            if (!mentionedUser) {
                continue;
            }
            attachment = currentAttachments.find(x => x._type === PostAttachmentTypeEnum.MENTION && x.user.toString() === userid);
            if (!attachment) {
                attachment = await PostAttachment.create({
                    postId: id.post ?? null,
                    channelMessageId: id.channelMessage ?? null,
                    _type: PostAttachmentTypeEnum.MENTION,
                    user: mentionedUser._id
                });
            }
        } catch (err: any) {
            console.log(err?.message);
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
}

declare interface IPostAttachment extends InferSchemaType<typeof postAttachmentSchema> { }

interface PostAttachmentModel extends Model<IPostAttachment> {
    getByPostId(id: { post?: mongoose.Types.ObjectId; channelMessage?: mongoose.Types.ObjectId; }): Promise<any[]>;
    updateAttachments(message: string, id: { post?: mongoose.Types.ObjectId; channelMessage?: mongoose.Types.ObjectId; }): Promise<void>;

}

const PostAttachment = mongoose.model<IPostAttachment, PostAttachmentModel>("PostAttachment", postAttachmentSchema);

export default PostAttachment;