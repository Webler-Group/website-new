"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Post_1 = __importDefault(require("./Post"));
const Code_1 = __importDefault(require("./Code"));
const confg_1 = require("../confg");
const regexUtils_1 = require("../utils/regexUtils");
const User_1 = __importDefault(require("./User"));
const Notification_1 = __importDefault(require("./Notification"));
const pushService_1 = require("../services/pushService");
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
                .populate("parentId", "title");
            if (!post || this.user == post.user._id)
                return;
            if (post._type == PostTypeEnum_1.default.QUESTION) {
                await (0, pushService_1.sendToUsers)([this.user.toString()], {
                    title: "New mention",
                    body: `${post.user.name} mentioned you in question "${post.title}"`
                }, "mentions");
                await Notification_1.default.create({
                    _type: NotificationTypeEnum_1.default.QA_QUESTION_MENTION,
                    user: this.user,
                    actionUser: post.user._id,
                    message: `{action_user} mentioned you in question "${post.title}"`,
                    questionId: post._id
                });
            }
            else if (post._type == PostTypeEnum_1.default.ANSWER) {
                await (0, pushService_1.sendToUsers)([this.user.toString()], {
                    title: "New mention",
                    body: `${post.user.name} mentioned you in answer to question "${post.parentId?.title}"`
                }, "mentions");
                await Notification_1.default.create({
                    _type: NotificationTypeEnum_1.default.QA_ANSWER_MENTION,
                    user: this.user,
                    actionUser: post.user._id,
                    message: `{action_user} mentioned you in answer to question "${post.parentId?.title}"`,
                    questionId: post.parentId?._id,
                    postId: post._id
                });
            }
            else if (post._type == PostTypeEnum_1.default.CODE_COMMENT) {
                await (0, pushService_1.sendToUsers)([this.user.toString()], {
                    title: "New mention",
                    body: `${post.user.name} mentioned you in comment to code "${post.codeId?.name}"`
                }, "mentions");
                await Notification_1.default.create({
                    _type: NotificationTypeEnum_1.default.CODE_COMMENT_MENTION,
                    user: this.user,
                    actionUser: post.user._id,
                    message: `{action_user} mentioned you in comment to code "${post.codeId?.name}"`,
                    codeId: post.codeId?._id,
                    postId: post._id
                });
            }
        }
        catch (err) {
            console.log("Error creating notifcations for post attachments: ", err);
        }
    }
});
// --- DELETE MANY ---
postAttachmentSchema.pre("deleteMany", { document: false, query: true }, async function (next) {
    const filter = this.getFilter();
    const docs = await this.model.find(filter).where({ _type: PostAttachmentTypeEnum_1.default.MENTION });
    this._docsToDelete = docs;
    next();
});
postAttachmentSchema.post("deleteMany", { document: false, query: true }, async function () {
    const docs = this._docsToDelete;
    if (!docs || docs.length === 0)
        return;
    for (let doc of docs) {
        try {
            if (!doc.postId)
                continue;
            const post = await Post_1.default.findById(doc.postId, "user _type parentId codeId");
            if (!post)
                continue;
            let filter = {
                user: doc.user,
                actionUser: post.user,
            };
            if (post._type === PostTypeEnum_1.default.QUESTION) {
                filter._type = NotificationTypeEnum_1.default.QA_QUESTION_MENTION;
                filter.questionId = post._id;
            }
            else if (post._type === PostTypeEnum_1.default.ANSWER) {
                filter._type = NotificationTypeEnum_1.default.QA_ANSWER_MENTION;
                filter.questionId = post.parentId;
                filter.postId = post._id;
            }
            else if (post._type === PostTypeEnum_1.default.CODE_COMMENT) {
                filter._type = NotificationTypeEnum_1.default.CODE_COMMENT_MENTION;
                filter.codeId = post.codeId;
                filter.postId = post._id;
            }
            else {
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
                    codeName: x.code.name,
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
                    questionTitle: x.question.title
                };
            case PostAttachmentTypeEnum_1.default.FEED:
                if (!x.feed)
                    return null;
                return {
                    id: x._id,
                    type: x._type,
                    ...userDetails,
                    feedId: x.feed._id,
                    feedMessage: (0, StringUtils_1.truncate)(x.feed.message, 20),
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
    const pattern = new RegExp("(" + confg_1.config.allowedOrigins.map(x => (0, regexUtils_1.escapeRegex)(x)).join("|") + ")\/([\\w\-]+)\/([\\w\-]+)", "gi");
    const matches = message.matchAll(pattern);
    for (let match of matches) {
        if (match.length < 4)
            continue;
        let attachment = null;
        switch (match[2]) {
            case "Compiler-Playground": {
                const codeId = match[3];
                try {
                    const code = await Code_1.default.findById(codeId);
                    if (!code) {
                        continue;
                    }
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
                }
                catch (err) {
                    console.log(err?.message);
                }
                break;
            }
            case "Discuss": {
                const questionId = match[3];
                try {
                    const question = await Post_1.default.findById(questionId);
                    if (!question) {
                        continue;
                    }
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
                }
                catch (err) {
                    console.log(err?.message);
                }
                break;
            }
            case "Feed": {
                const postId = match[3];
                try {
                    const post = await Post_1.default.findById(postId);
                    if (!post)
                        continue;
                    if (post._type !== PostTypeEnum_1.default.FEED && post._type !== PostTypeEnum_1.default.SHARED_FEED)
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
                }
                catch (err) {
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
            const mentionedUser = await User_1.default.findById(userid);
            if (!mentionedUser) {
                continue;
            }
            attachment = currentAttachments.find(x => x._type === PostAttachmentTypeEnum_1.default.MENTION && x.user.toString() === userid);
            if (!attachment) {
                attachment = await PostAttachment.create({
                    postId: id.post ?? null,
                    channelMessageId: id.channelMessage ?? null,
                    _type: PostAttachmentTypeEnum_1.default.MENTION,
                    user: mentionedUser._id
                });
            }
        }
        catch (err) {
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
};
const PostAttachment = mongoose_1.default.model("PostAttachment", postAttachmentSchema);
exports.default = PostAttachment;
