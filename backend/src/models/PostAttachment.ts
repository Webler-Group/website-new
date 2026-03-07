import { prop, getModelForClass, modelOptions, post, pre } from "@typegoose/typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { Types } from "mongoose";
import { getImageUrl } from "../controllers/mediaController";
import { truncate } from "../utils/StringUtils";
import { escapeMarkdown, escapeRegex } from "../utils/regexUtils";
import { config } from "../confg";
import PostTypeEnum from "../data/PostTypeEnum";
import PostAttachmentTypeEnum from "../data/PostAttachmentTypeEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { USER_MINIMAL_FIELDS, UserMinimal } from "./User";
import { Post } from "./Post";
import { Code } from "./Code";

@post<PostAttachment>("save", async function (doc) {
    if (doc._type == PostAttachmentTypeEnum.MENTION && doc.postId) {
        try {
            const { default: Post } = await import("./Post");
            const { default: Notification } = await import("./Notification");

            const post = await Post.findById(doc.postId, "-message")
                .populate<{ user: any }>("user", "name")
                .populate<{ codeId: any }>("codeId", "name")
                .populate<{ parentId: any }>("parentId", "title")
                .populate<{ lessonId: any }>({
                    path: "lessonId",
                    select: "course title",
                    populate: { path: "course", select: "code title" }
                })
                .populate<{ feedId: any }>("feedId", "message")
                .lean();

            if (!post || doc.user.toString() == post.user._id.toString()) return;

            switch (post._type) {
                case PostTypeEnum.QUESTION:
                    await Notification.sendToUsers([doc.user as Types.ObjectId], {
                        title: "New mention",
                        type: NotificationTypeEnum.QA_QUESTION_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in question "${post.title}"`,
                        questionId: post._id
                    });
                    break;
                case PostTypeEnum.ANSWER:
                    await Notification.sendToUsers([doc.user as Types.ObjectId], {
                        title: "New mention",
                        type: NotificationTypeEnum.QA_ANSWER_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in answer to question "${post.parentId?.title}"`,
                        questionId: post.parentId?._id,
                        postId: post._id
                    });
                    break;
                case PostTypeEnum.CODE_COMMENT:
                    await Notification.sendToUsers([doc.user as Types.ObjectId], {
                        title: "New mention",
                        type: NotificationTypeEnum.CODE_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment to code "${post.codeId?.name}"`,
                        codeId: post.codeId?._id,
                        postId: post._id
                    });
                    break;
                case PostTypeEnum.LESSON_COMMENT:
                    await Notification.sendToUsers([doc.user as Types.ObjectId], {
                        title: "New mention",
                        type: NotificationTypeEnum.LESSON_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment on lesson "${post.lessonId?.title}" to ${post.lessonId?.course.title}`,
                        lessonId: post.lessonId?._id,
                        postId: post._id,
                        courseCode: post.lessonId.course.code
                    });
                    break;
                case PostTypeEnum.FEED_COMMENT:
                    await Notification.sendToUsers([doc.user as Types.ObjectId], {
                        title: "New mention",
                        type: NotificationTypeEnum.FEED_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment to post "${truncate(escapeMarkdown(post.feedId?.message ?? ""), 20).replaceAll(/\n+/g, " ")}"`,
                        feedId: post.feedId?._id,
                        postId: post._id
                    });
                    break;
            }
        } catch (err: any) {
            console.log("Error creating notifications for post attachments:", err);
        }
    }
})
@pre<PostAttachment>("deleteMany", { document: false, query: true }, async function () {
    try {
        const filter = (this as any).getFilter();
        const docs = await (this as any).model.find(filter).where({ _type: PostAttachmentTypeEnum.MENTION });
        (this as any)._docsToDelete = docs;
    } catch (err) {
        console.log("Error in PostAttachment pre(deleteMany):", err);
    }
})
@post<PostAttachment>("deleteMany", { document: false, query: true }, async function () {
    const docs = (this as any)._docsToDelete as any[];
    if (!docs || docs.length === 0) return;

    const { default: Post } = await import("./Post");
    const { default: Notification } = await import("./Notification");

    for (const doc of docs) {
        try {
            if (!doc.postId) continue;
            const post = await Post.findById(doc.postId, "-message");
            if (!post) continue;

            let filter: any = { user: doc.user, actionUser: post.user };

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
})
@modelOptions({ schemaOptions: { collection: "postattachments" } })
export class PostAttachment {
    @prop({ ref: "Post", default: null })
    postId!: Types.ObjectId | null;

    @prop({ ref: "ChannelMessage", default: null })
    channelMessageId!: Types.ObjectId | null;

    @prop({
        required: true,
        enum: Object.values(PostAttachmentTypeEnum).filter(v => typeof v === "number").map(Number),
        type: Number
    })
    _type!: PostAttachmentTypeEnum;

    @prop({ ref: "Code", default: null })
    code!: Types.ObjectId | null;

    @prop({ ref: "Post", default: null })
    question!: Types.ObjectId | null;

    @prop({ ref: "Post", default: null })
    feed!: Types.ObjectId | null;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    // --- Statics ---
    static async getByPostId(
        this: ModelType<PostAttachment>,
        id: { post?: Types.ObjectId | string; channelMessage?: Types.ObjectId }
    ): Promise<any[]> {
        const result = await PostAttachmentModel
            .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null, _type: { $ne: PostAttachmentTypeEnum.MENTION } })
            .populate<{ code: Code & { _id: Types.ObjectId } }>("code", { name: 1, language: 1 })
            .populate<{ question: Post & { _id: Types.ObjectId } }>("question", { title: 1 })
            .populate<{ feed: Post & { _id: Types.ObjectId } }>("feed", { _type: 1, message: 1 })
            .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS);

        return result.map(x => {
            const userDetails = {
                userId: x.user._id,
                userName: x.user.name,
                userAvatarUrl: getImageUrl(x.user.avatarHash),
                countryCode: x.user.countryCode,
                level: x.user.level,
                roles: x.user.roles
            };
            switch (x._type) {
                case PostAttachmentTypeEnum.CODE:
                    if (!x.code) return null;
                    return { id: x._id, type: x._type, ...userDetails, codeId: x.code._id, codeName: truncate(x.code.name, 40), codeLanguage: x.code.language };
                case PostAttachmentTypeEnum.QUESTION:
                    if (!x.question) return null;
                    return { id: x._id, type: x._type, ...userDetails, questionId: x.question._id, questionTitle: truncate(x.question.title!, 40) };
                case PostAttachmentTypeEnum.FEED:
                    if (!x.feed) return null;
                    return { id: x._id, type: x._type, ...userDetails, feedId: x.feed._id, feedMessage: truncate(escapeMarkdown(x.feed.message), 40).replaceAll(/\n+/g, " "), feedType: x.feed._type };
            }
            return null;
        }).filter(x => x !== null);
    }

    static async updateAttachments(
        this: ModelType<PostAttachment>,
        message: string,
        id: { post?: Types.ObjectId; channelMessage?: Types.ObjectId }
    ): Promise<void> {
        const { isObjectIdOrHexString } = await import("mongoose");
        const { default: Code } = await import("./Code");
        const { default: Post } = await import("./Post");
        const { default: User } = await import("./User");

        const currentAttachments = await PostAttachmentModel.find({
            postId: id.post ?? null,
            channelMessageId: id.channelMessage ?? null
        });

        const newAttachmentIds: Types.ObjectId[] = [];
        const pattern = new RegExp(
            "(" + config.allowedOrigins.map(x => escapeRegex(x)).join("|") + ")\\/([\\w\\-]+)\\/([0-9a-fA-F]{24})",
            "gi"
        );

        for (const match of message.matchAll(pattern)) {
            if (match.length < 4 || !isObjectIdOrHexString(match[3])) continue;
            let attachment = null;

            switch (match[2].toLowerCase()) {
                case "compiler-playground": {
                    const codeId = new Types.ObjectId(match[3]);
                    const code = await Code.findById(codeId);
                    if (!code) continue;
                    attachment = currentAttachments.find(x => x.code && x.code.equals(codeId));
                    if (!attachment) {
                        attachment = await PostAttachmentModel.create({
                            postId: id.post ?? null, channelMessageId: id.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.CODE, code: codeId, user: code.user
                        });
                    }
                    break;
                }
                case "discuss": {
                    const questionId = new Types.ObjectId(match[3]);
                    const question = await Post.findById(questionId);
                    if (!question) continue;
                    attachment = currentAttachments.find(x => x.question && x.question.equals(questionId));
                    if (!attachment) {
                        attachment = await PostAttachmentModel.create({
                            postId: id.post ?? null, channelMessageId: id.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.QUESTION, question: questionId, user: question.user
                        });
                    }
                    break;
                }
                case "feed": {
                    const postId = new Types.ObjectId(match[3]);
                    const post = await Post.findById(postId);
                    if (!post || (post._type !== PostTypeEnum.FEED && post._type !== PostTypeEnum.SHARED_FEED)) continue;
                    attachment = currentAttachments.find(x => x.feed && x.feed.toString() === postId.toString());
                    if (!attachment) {
                        attachment = await PostAttachmentModel.create({
                            postId: id.post ?? null, channelMessageId: id.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.FEED, feed: postId, user: post.user
                        });
                    }
                    break;
                }
            }
            if (attachment) newAttachmentIds.push(attachment._id);
        }

        const userPattern = /\[user id="([0-9a-fA-F]{24})"\](.+?)\[\/user\]/gi;
        for (const match of message.matchAll(userPattern)) {
            const userid = match[1];
            if (!isObjectIdOrHexString(userid)) continue;
            const mentionedUser = await User.findById(userid);
            if (!mentionedUser) continue;
            let attachment = currentAttachments.find(x => x._type === PostAttachmentTypeEnum.MENTION && x.user.equals(userid));
            if (!attachment) {
                attachment = await PostAttachmentModel.create({
                    postId: id.post ?? null, channelMessageId: id.channelMessage ?? null,
                    _type: PostAttachmentTypeEnum.MENTION, user: mentionedUser._id
                });
            }
            if (attachment) newAttachmentIds.push(attachment._id);
        }

        const idsToDelete = currentAttachments.map(x => x._id).filter(v => !newAttachmentIds.includes(v));
        await PostAttachmentModel.deleteMany({ _id: { $in: idsToDelete } });
    }
}

const PostAttachmentModel = getModelForClass(PostAttachment);
export default PostAttachmentModel;