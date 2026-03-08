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
    }).filter(x => x !== null);
}

export const updatePostAttachments = async (message: string, id: { post?: Types.ObjectId; channelMessage?: Types.ObjectId }, session?: mongoose.ClientSession) => {
    const currentAttachments = await PostAttachmentModel.find({
        postId: id.post ?? null,
        channelMessageId: id.channelMessage ?? null
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
                if (!code) continue;
                attachment = currentAttachments.find(x => x.code && x.code.equals(codeId)) || null;
                if (!attachment) {
                    [attachment] = await PostAttachmentModel.create([{
                        postId: id.post ?? null, channelMessageId: id.channelMessage ?? null,
                        _type: PostAttachmentTypeEnum.CODE, code: codeId, user: code.user
                    }], { session });
                }
                break;
            }
            case "discuss": {
                const questionId = new Types.ObjectId(match[3]);
                const question = await PostModel.findById(questionId, { user: 1 }).lean().session(session ?? null);
                if (!question) continue;
                attachment = currentAttachments.find(x => x.question && x.question.equals(questionId)) || null;
                if (!attachment) {
                    [attachment] = await PostAttachmentModel.create([{
                        postId: id.post ?? null, channelMessageId: id.channelMessage ?? null,
                        _type: PostAttachmentTypeEnum.QUESTION, question: questionId, user: question.user
                    }], { session });
                }
                break;
            }
            case "feed": {
                const postId = new Types.ObjectId(match[3]);
                const post = await PostModel.findById(postId, { _type: 1, user: 1 }).lean().session(session ?? null);
                if (!post || (post._type !== PostTypeEnum.FEED && post._type !== PostTypeEnum.SHARED_FEED)) continue;
                attachment = currentAttachments.find(x => x.feed && x.feed.equals(postId)) || null;
                if (!attachment) {
                    [attachment] = await PostAttachmentModel.create([{
                        postId: id.post ?? null, channelMessageId: id.channelMessage ?? null,
                        _type: PostAttachmentTypeEnum.FEED, feed: postId, user: post.user
                    }], { session });
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
        const mentionedUser = await UserModel.findById(userid).lean().session(session ?? null);
        if (!mentionedUser) continue;
        let attachment = currentAttachments.find(x => x._type === PostAttachmentTypeEnum.MENTION && x.user.equals(userid));
        if (!attachment) {
            [attachment] = await PostAttachmentModel.create([{
                postId: id.post ?? null, channelMessageId: id.channelMessage ?? null,
                _type: PostAttachmentTypeEnum.MENTION, user: mentionedUser._id
            }], { session });
            const post = await PostModel.findById(attachment.postId, { message: 0 })
                .populate<{ user: { name: string, _id: Types.ObjectId } }>("user", { name: 1 })
                .populate<{ codeId: { name: string, _id: Types.ObjectId } }>("codeId", { name: 1 })
                .populate<{ parentId: { title: string, _id: Types.ObjectId } }>("parentId", { title: 1 })
                .populate<{ lessonId: { title: string, _id: Types.ObjectId, course: { code: string, title: string } } }>({
                    path: "lessonId",
                    select: { course: 1, title: 1 },
                    populate: { path: "course", select: { code: 1, title: 1 } }
                })
                .populate<{ feedId: { message: string, _id: Types.ObjectId } }>("feedId", { message: 1 })
                .lean();

            if (!post || attachment.user.equals(post.user._id)) return;

            switch (post._type) {
                case PostTypeEnum.QUESTION:
                    await sendNotifications({
                        title: "New mention",
                        type: NotificationTypeEnum.QA_QUESTION_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in question "${post.title}"`,
                        questionId: post._id
                    }, [attachment.user]);
                    break;
                case PostTypeEnum.ANSWER:
                    await sendNotifications({
                        title: "New mention",
                        type: NotificationTypeEnum.QA_ANSWER_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in answer to question "${post.parentId?.title}"`,
                        questionId: post.parentId?._id,
                        postId: post._id
                    }, [attachment.user]);
                    break;
                case PostTypeEnum.CODE_COMMENT:
                    await sendNotifications({
                        title: "New mention",
                        type: NotificationTypeEnum.CODE_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment to code "${post.codeId?.name}"`,
                        codeId: post.codeId?._id,
                        postId: post._id
                    }, [attachment.user]);
                    break;
                case PostTypeEnum.LESSON_COMMENT:
                    await sendNotifications({
                        title: "New mention",
                        type: NotificationTypeEnum.LESSON_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment on lesson "${post.lessonId?.title}" to ${post.lessonId?.course.title}`,
                        lessonId: post.lessonId?._id,
                        postId: post._id,
                        courseCode: post.lessonId.course.code
                    }, [attachment.user]);
                    break;
                case PostTypeEnum.FEED_COMMENT:
                    await sendNotifications({
                        title: "New mention",
                        type: NotificationTypeEnum.FEED_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment to post "${truncate(escapeMarkdown(post.feedId?.message ?? ""), 20).replaceAll(/\n+/g, " ")}"`,
                        feedId: post.feedId?._id,
                        postId: post._id
                    }, [attachment.user]);
                    break;
            }
        }
        if (attachment) newAttachmentIds.push(attachment._id);
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