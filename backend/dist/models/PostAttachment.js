"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const Post_1 = __importDefault(require("./Post"));
const Code_1 = __importDefault(require("./Code"));
const confg_1 = require("../confg");
const regexUtils_1 = require("../utils/regexUtils");
const User_1 = __importDefault(require("./User"));
const Notification_1 = __importDefault(require("./Notification"));
const StringUtils_1 = require("../utils/StringUtils");
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const PostTypeEnum_1 = __importDefault(require("../data/PostTypeEnum"));
const PostAttachmentTypeEnum_1 = __importDefault(require("../data/PostAttachmentTypeEnum"));
const postAttachmentSchema = new mongoose_1.default.Schema({
    postId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post",
        default: null
    },
    channelMessageId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "ChannelMessage",
        default: null
    },
    _type: {
        type: Number,
        required: true,
        enum: Object.values(PostAttachmentTypeEnum_1.default).map(Number)
    },
    code: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Code",
        default: null
    },
    question: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post",
        default: null
    },
    feed: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post",
        default: null
    },
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    }
});
postAttachmentSchema.post("save", async function () {
    if (this._type == PostAttachmentTypeEnum_1.default.MENTION && this.postId) {
        try {
            const post = await Post_1.default.findById(this.postId, "-message")
                .populate("user", "name")
                .populate("codeId", "name")
                .populate("parentId", "title")
                .populate({
                path: "lessonId",
                select: "course title",
                populate: {
                    path: "course",
                    select: "code title"
                }
            })
                .populate("feedId", "message")
                .lean();
            if (!post || this.user.toString() == post.user._id.toString())
                return;
            switch (post._type) {
                case PostTypeEnum_1.default.QUESTION:
                    await Notification_1.default.sendToUsers([this.user], {
                        title: "New mention",
                        type: NotificationTypeEnum_1.default.QA_QUESTION_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in question "${post.title}"`,
                        questionId: post._id
                    });
                    break;
                case PostTypeEnum_1.default.ANSWER:
                    await Notification_1.default.sendToUsers([this.user], {
                        title: "New mention",
                        type: NotificationTypeEnum_1.default.QA_ANSWER_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in answer to question "${post.parentId?.title}"`,
                        questionId: post.parentId?._id,
                        postId: post._id
                    });
                    break;
                case PostTypeEnum_1.default.CODE_COMMENT:
                    await Notification_1.default.sendToUsers([this.user], {
                        title: "New mention",
                        type: NotificationTypeEnum_1.default.CODE_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment to code "${post.codeId?.name}"`,
                        codeId: post.codeId?._id,
                        postId: post._id
                    });
                    break;
                case PostTypeEnum_1.default.LESSON_COMMENT:
                    await Notification_1.default.sendToUsers([this.user], {
                        title: "New mention",
                        type: NotificationTypeEnum_1.default.LESSON_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment on lesson "${post.lessonId?.title}" to ${post.lessonId?.course.title}`,
                        lessonId: post.lessonId?._id,
                        postId: post._id,
                        courseCode: post.lessonId.course.code
                    });
                    break;
                case PostTypeEnum_1.default.FEED_COMMENT:
                    await Notification_1.default.sendToUsers([this.user], {
                        title: "New mention",
                        type: NotificationTypeEnum_1.default.FEED_COMMENT_MENTION,
                        actionUser: post.user._id,
                        message: `{action_user} mentioned you in comment to post "${(0, StringUtils_1.truncate)((0, regexUtils_1.escapeMarkdown)(post.feedId?.message ?? ""), 20).replaceAll(/\n+/g, " ")}"`,
                        feedId: post.feedId?._id,
                        postId: post._id
                    });
                    break;
            }
        }
        catch (err) {
            console.log("Error creating notifcations for post attachments:", err);
        }
    }
});
// --- DELETE MANY ---
postAttachmentSchema.pre("deleteMany", { document: false, query: true }, async function (next) {
    try {
        const filter = this.getFilter();
        const docs = await this.model.find(filter).where({ _type: PostAttachmentTypeEnum_1.default.MENTION });
        this._docsToDelete = docs;
    }
    catch (err) {
        console.log("Error in postAttachmentSchema.pre(deleteMany):", err);
    }
    finally {
        next();
    }
});
postAttachmentSchema.post("deleteMany", { document: false, query: true }, async function () {
    const docs = this._docsToDelete;
    if (!docs || docs.length === 0)
        return;
    for (let doc of docs) {
        try {
            if (!doc.postId)
                continue;
            const post = await Post_1.default.findById(doc.postId, "-message");
            if (!post)
                continue;
            let filter = {
                user: doc.user,
                actionUser: post.user,
            };
            switch (post._type) {
                case PostTypeEnum_1.default.QUESTION:
                    filter._type = NotificationTypeEnum_1.default.QA_QUESTION_MENTION;
                    filter.questionId = post._id;
                    break;
                case PostTypeEnum_1.default.ANSWER:
                    filter._type = NotificationTypeEnum_1.default.QA_ANSWER_MENTION;
                    filter.questionId = post.parentId;
                    filter.postId = post._id;
                    break;
                case PostTypeEnum_1.default.CODE_COMMENT:
                    filter._type = NotificationTypeEnum_1.default.CODE_COMMENT_MENTION;
                    filter.codeId = post.codeId;
                    filter.postId = post._id;
                    break;
                case PostTypeEnum_1.default.LESSON_COMMENT:
                    filter._type = NotificationTypeEnum_1.default.LESSON_COMMENT_MENTION;
                    filter.lessonId = post.lessonId;
                    filter.postId = post._id;
                    break;
                case PostTypeEnum_1.default.FEED_COMMENT:
                    filter._type = NotificationTypeEnum_1.default.FEED_COMMENT_MENTION;
                    filter.feedId = post.feedId;
                    filter.postId = post._id;
                    break;
                default:
                    continue;
            }
            await Notification_1.default.deleteMany(filter);
        }
        catch (err) {
            console.log("Error deleting notification for PostAttachment:", err);
        }
    }
});
postAttachmentSchema.statics.getByPostId = async function (id) {
    const result = await PostAttachment
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null, _type: { $ne: PostAttachmentTypeEnum_1.default.MENTION } })
        .populate("code", "name language")
        .populate("question", "title")
        .populate("feed")
        .populate("user", "name avatarImage countryCode level roles");
    return result.map((x) => {
        const userDetails = {
            userId: x.user._id,
            userName: x.user.name,
            userAvatar: x.user.avatarImage,
            countryCode: x.user.countryCode,
            level: x.user.level,
            roles: x.user.roles
        };
        switch (x._type) {
            case PostAttachmentTypeEnum_1.default.CODE:
                if (!x.code)
                    return null;
                return {
                    id: x._id,
                    type: x._type,
                    ...userDetails,
                    codeId: x.code._id,
                    codeName: (0, StringUtils_1.truncate)(x.code.name, 40),
                    codeLanguage: x.code.language
                };
            case PostAttachmentTypeEnum_1.default.QUESTION:
                if (!x.question)
                    return null;
                return {
                    id: x._id,
                    type: x._type,
                    ...userDetails,
                    questionId: x.question._id,
                    questionTitle: (0, StringUtils_1.truncate)(x.question.title, 40)
                };
            case PostAttachmentTypeEnum_1.default.FEED:
                if (!x.feed)
                    return null;
                return {
                    id: x._id,
                    type: x._type,
                    ...userDetails,
                    feedId: x.feed._id,
                    feedMessage: (0, StringUtils_1.truncate)((0, regexUtils_1.escapeMarkdown)(x.feed.message), 40).replaceAll(/\n+/g, " "),
                    feedType: x.feed._type
                };
        }
        return null;
    })
        .filter(x => x !== null);
};
postAttachmentSchema.statics.updateAttachments = async function (message, id) {
    const currentAttachments = await PostAttachment
        .find({ postId: id.post ?? null, channelMessageId: id.channelMessage ?? null });
    const newAttachmentIds = [];
    const pattern = new RegExp("(" + confg_1.config.allowedOrigins.map(x => (0, regexUtils_1.escapeRegex)(x)).join("|") + ")\/([\\w\-]+)\/([0-9a-fA-F]{24})", "gi");
    const matches = message.matchAll(pattern);
    for (let match of matches) {
        if (match.length < 4 || !(0, mongoose_1.isObjectIdOrHexString)(match[3]))
            continue;
        let attachment = null;
        switch (match[2].toLowerCase()) {
            case "compiler-playground": {
                const codeId = match[3];
                const code = await Code_1.default.findById(codeId);
                if (!code)
                    continue;
                attachment = currentAttachments.find(x => x.code && x.code == codeId);
                if (!attachment) {
                    attachment = await PostAttachment.create({
                        postId: id.post ?? null,
                        channelMessageId: id.channelMessage ?? null,
                        _type: PostAttachmentTypeEnum_1.default.CODE,
                        code: codeId,
                        user: code.user
                    });
                }
                break;
            }
            case "discuss": {
                const questionId = match[3];
                const question = await Post_1.default.findById(questionId);
                if (!question)
                    continue;
                attachment = currentAttachments.find(x => x.question && x.question == questionId);
                if (!attachment) {
                    attachment = await PostAttachment.create({
                        postId: id.post ?? null,
                        channelMessageId: id.channelMessage ?? null,
                        _type: PostAttachmentTypeEnum_1.default.QUESTION,
                        question: questionId,
                        user: question.user
                    });
                }
                break;
            }
            case "feed": {
                const postId = match[3];
                const post = await Post_1.default.findById(postId);
                if (!post || (post._type !== PostTypeEnum_1.default.FEED && post._type !== PostTypeEnum_1.default.SHARED_FEED))
                    continue;
                attachment = currentAttachments.find(x => x.feed && x.feed == postId);
                if (!attachment) {
                    attachment = await PostAttachment.create({
                        postId: id.post ?? null,
                        channelMessageId: id.channelMessage ?? null,
                        _type: PostAttachmentTypeEnum_1.default.FEED,
                        feed: postId,
                        user: post.user
                    });
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
        if (!(0, mongoose_1.isObjectIdOrHexString)(userid))
            continue;
        const mentionedUser = await User_1.default.findById(userid);
        if (!mentionedUser)
            continue;
        attachment = currentAttachments.find(x => x._type === PostAttachmentTypeEnum_1.default.MENTION && x.user.toString() === userid);
        if (!attachment) {
            attachment = await PostAttachment.create({
                postId: id.post ?? null,
                channelMessageId: id.channelMessage ?? null,
                _type: PostAttachmentTypeEnum_1.default.MENTION,
                user: mentionedUser._id
            });
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
};
const PostAttachment = mongoose_1.default.model("PostAttachment", postAttachmentSchema);
exports.default = PostAttachment;
