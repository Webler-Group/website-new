import mongoose, { isObjectIdOrHexString, Types, TypesAreEqual } from "mongoose";
import PostModel, { Post } from "../models/Post";
import PostTypeEnum from "../data/PostTypeEnum";
import { deleteNotifications, sendNotifications } from "./notificationHelper";
import PostFollowingModel from "../models/PostFollowing";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import CodeModel, { Code } from "../models/Code";
import CourseLessonModel from "../models/CourseLesson";
import Upvote from "../models/Upvote";
import PostAttachmentModel, { PostAttachment } from "../models/PostAttachment";
import PostAttachmentTypeEnum from "../data/PostAttachmentTypeEnum";
import UserModel, { USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { formatUserMinimal } from "./userHelper";
import { truncate } from "../utils/StringUtils";
import { escapeMarkdown, escapeRegex } from "../utils/regexUtils";
import { config } from "../confg";
import { DocumentType } from "@typegoose/typegoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

export interface PostAttachmentDetails {
    id: Types.ObjectId;
    type: PostAttachmentTypeEnum;
    user: UserMinimal;
    codeId?: Types.ObjectId;
    codeName?: string;
    codeLanguage?: CompilerLanguagesEnum;
    questionId?: Types.ObjectId;
    questionTitle?: string;
    feedId?: Types.ObjectId;
    feedMessage?: string;
}

type PopulatedParentPost = Post & {
    _id: Types.ObjectId;
    user: { name: string; _id: Types.ObjectId };
    codeId: { name: string; _id: Types.ObjectId } | null;
    parentId: { title: string; _id: Types.ObjectId } | null;
    lessonId: {
        title: string;
        _id: Types.ObjectId;
        course: { code: string; title: string };
    } | null;
    feedId: { message: string; _id: Types.ObjectId } | null;
};

export const deletePostsAndCleanup = async (filter: mongoose.QueryFilter<Post>, session?: mongoose.ClientSession) => {
    const postsToDelete = await PostModel.find(filter, { message: 0 }).lean().session(session ?? null);

    for (const post of postsToDelete) {
        switch (post._type) {
            case PostTypeEnum.QUESTION: {
                await deletePostsAndCleanup({ parentId: post._id }, session);
                await PostFollowingModel.deleteMany({ following: post._id }, { session });
                break;
            }
            case PostTypeEnum.ANSWER: {
                const question = await PostModel.findById(post.parentId).session(session ?? null);
                if (question) {
                    question.$inc("answers", -1);
                    await question.save({ session });
                    await deleteNotifications({
                        _type: NotificationTypeEnum.QA_ANSWER,
                        questionId: question._id,
                        postId: post._id
                    }, session);
                }
                break;
            }
            case PostTypeEnum.CODE_COMMENT: {
                const code = await CodeModel.findById(post.codeId).session(session ?? null);
                if (code) {
                    code.$inc("comments", -1);
                    await code.save({ session });
                    const parentComment = await PostModel.findById(post.parentId).session(session ?? null);
                    if (parentComment) {
                        parentComment.$inc("answers", -1);
                        await parentComment.save({ session });
                    }
                    await deletePostsAndCleanup({ parentId: post._id }, session);
                    await deleteNotifications({
                        _type: NotificationTypeEnum.CODE_COMMENT,
                        codeId: code._id,
                        postId: post._id
                    }, session);
                }
                break;
            }
            case PostTypeEnum.FEED:
            case PostTypeEnum.SHARED_FEED: {
                await deletePostsAndCleanup({ parentId: post._id, _type: PostTypeEnum.FEED_COMMENT }, session);
                await deleteNotifications({ feedId: post._id }, session);
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
                    await deletePostsAndCleanup({ parentId: post._id }, session);
                    await deleteNotifications({
                        _type: NotificationTypeEnum.FEED_COMMENT,
                        feedId: feed._id,
                        postId: post._id
                    }, session);
                }
                break;
            }
            case PostTypeEnum.LESSON_COMMENT: {
                const lesson = await CourseLessonModel.findById(post.lessonId).session(session ?? null);
                if (lesson) {
                    lesson.$inc("comments", -1);
                    await lesson.save({ session });
                    const parentComment = await PostModel.findById(post.parentId).session(session ?? null);
                    if (parentComment) {
                        parentComment.$inc("answers", -1);
                        await parentComment.save({ session });
                    }
                    await deletePostsAndCleanup({ parentId: post._id }, session);
                    await deleteNotifications({
                        _type: NotificationTypeEnum.LESSON_COMMENT,
                        lessonId: lesson._id,
                        postId: post._id
                    }, session);
                }
                break;
            }
        }
        await Upvote.deleteMany({ parentId: post._id }, { session });
        await PostAttachmentModel.deleteMany({ postId: post._id }, { session });
    }

    await PostModel.deleteMany(filter, { session });
}

export const getAttachmentsByPostId = async (id: { post?: Types.ObjectId | string; channelMessage?: Types.ObjectId }) => {
    const result = await PostAttachmentModel
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null, _type: { $ne: PostAttachmentTypeEnum.MENTION } })
        .populate<{ code: Code & { _id: Types.ObjectId } }>("code", { name: 1, language: 1 })
        .populate<{ question: Post & { _id: Types.ObjectId } }>("question", { title: 1 })
        .populate<{ feed: Post & { _id: Types.ObjectId } }>("feed", { _type: 1, message: 1 })
        .populate<{ user: UserMinimal & { _id: Types.ObjectId } }>("user", USER_MINIMAL_FIELDS);

    return result.map(x => {
        const user = formatUserMinimal(x.user);
        switch (x._type) {
            case PostAttachmentTypeEnum.CODE:
                if (!x.code) return null;
                return { id: x._id, type: x._type, user, codeId: x.code._id, codeName: truncate(x.code.name, 40), codeLanguage: x.code.language };
            case PostAttachmentTypeEnum.QUESTION:
                if (!x.question) return null;
                return { id: x._id, type: x._type, user, questionId: x.question._id, questionTitle: truncate(x.question.title!, 40) };
            case PostAttachmentTypeEnum.FEED:
                if (!x.feed) return null;
                return { id: x._id, type: x._type, user, feedId: x.feed._id, feedMessage: truncate(escapeMarkdown(x.feed.message), 40).replaceAll(/\n+/g, " "), feedType: x.feed._type };
        }
        return null;
    }).filter(x => x !== null) as PostAttachmentDetails[];
}

export const updatePostAttachments = async (message: string, parentId: { post?: Types.ObjectId; channelMessage?: Types.ObjectId }, session?: mongoose.ClientSession) => {
    const currentAttachments = await PostAttachmentModel.find({
        postId: parentId.post ?? null,
        channelMessageId: parentId.channelMessage ?? null
    }).lean().session(session ?? null);

    const newAttachmentIds: Types.ObjectId[] = [];
    const pattern = new RegExp(
        "(" + config.allowedOrigins.map(x => escapeRegex(x)).join("|") + ")\\/([\\w\\-]+)\\/([0-9a-fA-F]{24})",
        "gi"
    );

    for (const match of message.matchAll(pattern)) {
        if (match.length < 4 || !isObjectIdOrHexString(match[3])) continue;

        let attachment: PostAttachment & { _id: Types.ObjectId } | null = null;

        switch (match[2].toLowerCase()) {
            case "compiler-playground": {
                const codeId = new Types.ObjectId(match[3]);
                const code = await CodeModel.findById(codeId, { user: 1 }).lean().session(session ?? null);
                if (code) {
                    attachment = currentAttachments.find(x => x.code && x.code.equals(codeId)) ?? null;
                    if (!attachment) {
                        [attachment] = await PostAttachmentModel.create([{
                            postId: parentId.post ?? null,
                            channelMessageId: parentId.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.CODE,
                            code: codeId,
                            user: code.user
                        }], { session });
                    }
                }
                break;
            }
            case "discuss": {
                const questionId = new Types.ObjectId(match[3]);
                const question = await PostModel.findById(questionId, { user: 1 }).lean().session(session ?? null);
                if (question) {
                    attachment = currentAttachments.find(x => x.question && x.question.equals(questionId)) ?? null;
                    if (!attachment) {
                        [attachment] = await PostAttachmentModel.create([{
                            postId: parentId.post ?? null,
                            channelMessageId: parentId.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.QUESTION,
                            question: questionId,
                            user: question.user
                        }], { session });
                    }
                }
                break;
            }
            case "feed": {
                const postId = new Types.ObjectId(match[3]);
                const feed = await PostModel.findOne({ _id: postId, _type: { $in: [PostTypeEnum.FEED, PostTypeEnum.SHARED_FEED] } }, { _type: 1, user: 1 }).lean().session(session ?? null);
                if (feed) {
                    attachment = currentAttachments.find(x => x.feed && x.feed.equals(postId)) ?? null;
                    if (!attachment) {
                        [attachment] = await PostAttachmentModel.create([{
                            postId: parentId.post ?? null,
                            channelMessageId: parentId.channelMessage ?? null,
                            _type: PostAttachmentTypeEnum.FEED,
                            feed: postId,
                            user: feed.user
                        }], { session });
                    }
                }
                break;
            }
        }
        if (attachment) newAttachmentIds.push(attachment._id);
    }

    if (parentId.post) {
        const parentPost = await PostModel.findById(parentId.post, { message: 0 })
            .populate("user", { name: 1 })
            .populate("codeId", { name: 1 })
            .populate("parentId", { title: 1 })
            .populate({
                path: "lessonId",
                select: { course: 1, title: 1 },
                populate: { path: "course", select: { code: 1, title: 1 } }
            })
            .populate("feedId", { message: 1 })
            .lean<PopulatedParentPost>()
            .session(session ?? null);

        if (parentPost) {
            const validUserIds = new Set<string>();
            const userPattern = /\[user id="([0-9a-fA-F]{24})"\](.+?)\[\/user\]/gi;

            for (const match of message.matchAll(userPattern)) {
                const userId = match[1];
                if (isObjectIdOrHexString(userId)) {
                    validUserIds.add(userId);
                }
            }

            for (const userId of validUserIds) {
                const mentionedUser = await UserModel.findById(userId, { _id: 1 }).lean().session(session ?? null);
                if (mentionedUser) {
                    let attachment = currentAttachments.find(x => x._type === PostAttachmentTypeEnum.MENTION && x.user.equals(userId));
                    if (!attachment) {
                        attachment = await createMentionAttachment(parentPost, mentionedUser._id, session);
                    }
                    if (attachment) newAttachmentIds.push(attachment._id);
                }
            }
        }
    }

    const idsToDelete = currentAttachments.map(x => x._id).filter(v => !newAttachmentIds.includes(v));
    await deletePostAttachments({ _id: { $in: idsToDelete } }, session);
}

export const deletePostAttachments = async (filter: mongoose.QueryFilter<PostAttachment>, session?: mongoose.ClientSession) => {
    const attachmentsToDelete = await PostAttachmentModel.find(filter, { user: 1, postId: 1 }).where({ _type: PostAttachmentTypeEnum.MENTION }).lean().session(session ?? null);
    for (const attachment of attachmentsToDelete) {
        if (!attachment.postId) continue;
        const post = await PostModel.findById(attachment.postId, { message: 0 }).lean().session(session ?? null);
        if (!post) continue;

        const notficationFilter: mongoose.QueryFilter<Notification> = { user: attachment.user, actionUser: post.user };

        switch (post._type) {
            case PostTypeEnum.QUESTION:
                notficationFilter._type = NotificationTypeEnum.QA_QUESTION_MENTION;
                notficationFilter.questionId = post._id;
                break;
            case PostTypeEnum.ANSWER:
                notficationFilter._type = NotificationTypeEnum.QA_ANSWER_MENTION;
                notficationFilter.questionId = post.parentId;
                notficationFilter.postId = post._id;
                break;
            case PostTypeEnum.CODE_COMMENT:
                notficationFilter._type = NotificationTypeEnum.CODE_COMMENT_MENTION;
                notficationFilter.codeId = post.codeId;
                notficationFilter.postId = post._id;
                break;
            case PostTypeEnum.LESSON_COMMENT:
                notficationFilter._type = NotificationTypeEnum.LESSON_COMMENT_MENTION;
                notficationFilter.lessonId = post.lessonId;
                notficationFilter.postId = post._id;
                break;
            case PostTypeEnum.FEED_COMMENT:
                notficationFilter._type = NotificationTypeEnum.FEED_COMMENT_MENTION;
                notficationFilter.feedId = post.feedId;
                notficationFilter.postId = post._id;
                break;
            default:
                continue;
        }

        await deleteNotifications(notficationFilter, session);
    }
}

export const savePost = async (post: DocumentType<Post>, session?: mongoose.ClientSession) => {
    const messageModified = post.isNew || post.isModified("message");

    await post.save({ session });

    if (messageModified) {
        await updatePostAttachments(post.message, { post: post._id }, session);
    }
};

const createMentionAttachment = async (parentPost: PopulatedParentPost, mentionedUserId: Types.ObjectId, session?: mongoose.ClientSession) => {
    const [attachment] = await PostAttachmentModel.create([{
        postId: parentPost._id ?? null,
        _type: PostAttachmentTypeEnum.MENTION,
        user: mentionedUserId
    }], { session });

    if (attachment.user.equals(parentPost.user._id)) return;

    switch (parentPost._type) {
        case PostTypeEnum.QUESTION:
            await sendNotifications({
                title: "New mention",
                type: NotificationTypeEnum.QA_QUESTION_MENTION,
                actionUser: parentPost.user._id,
                message: `{action_user} mentioned you in question "${parentPost.title}"`,
                questionId: parentPost._id
            }, [attachment.user]);
            break;
        case PostTypeEnum.ANSWER:
            if (parentPost.parentId) {
                await sendNotifications({
                    title: "New mention",
                    type: NotificationTypeEnum.QA_ANSWER_MENTION,
                    actionUser: parentPost.user._id,
                    message: `{action_user} mentioned you in answer to question "${parentPost.parentId.title}"`,
                    questionId: parentPost.parentId._id,
                    postId: parentPost._id
                }, [attachment.user]);
            }
            break;
        case PostTypeEnum.CODE_COMMENT:
            if (parentPost.codeId) {
                await sendNotifications({
                    title: "New mention",
                    type: NotificationTypeEnum.CODE_COMMENT_MENTION,
                    actionUser: parentPost.user._id,
                    message: `{action_user} mentioned you in comment to code "${parentPost.codeId.name}"`,
                    codeId: parentPost.codeId._id,
                    postId: parentPost._id
                }, [attachment.user]);
            }
            break;
        case PostTypeEnum.LESSON_COMMENT:
            if (parentPost.lessonId) {
                await sendNotifications({
                    title: "New mention",
                    type: NotificationTypeEnum.LESSON_COMMENT_MENTION,
                    actionUser: parentPost.user._id,
                    message: `{action_user} mentioned you in comment on lesson "${parentPost.lessonId.title}" to ${parentPost.lessonId.course.title}`,
                    lessonId: parentPost.lessonId._id,
                    postId: parentPost._id,
                    courseCode: parentPost.lessonId.course.code
                }, [attachment.user]);
            }
            break;
        case PostTypeEnum.FEED_COMMENT:
            if (parentPost.feedId) {
                await sendNotifications({
                    title: "New mention",
                    type: NotificationTypeEnum.FEED_COMMENT_MENTION,
                    actionUser: parentPost.user._id,
                    message: `{action_user} mentioned you in comment to post "${truncate(escapeMarkdown(parentPost.feedId.message ?? ""), 20).replaceAll(/\n+/g, " ")}"`,
                    feedId: parentPost.feedId._id,
                    postId: parentPost._id
                }, [attachment.user]);
            }
            break;
    }

    return attachment;
}