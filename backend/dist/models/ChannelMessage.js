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
const socketServer_1 = require("../config/socketServer");
const ChannelParticipant_1 = __importDefault(require("./ChannelParticipant"));
const User_1 = __importDefault(require("./User"));
const Channel_1 = __importDefault(require("./Channel"));
const PostAttachment_1 = __importDefault(require("./PostAttachment"));
const ChannelMessageTypeEnum_1 = __importDefault(require("../data/ChannelMessageTypeEnum"));
const ChannelTypeEnum_1 = __importDefault(require("../data/ChannelTypeEnum"));
const Notification_1 = __importDefault(require("./Notification"));
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const StringUtils_1 = require("../utils/StringUtils");
const channelMessageSchema = new mongoose_1.Schema({
    _type: {
        type: Number,
        required: true,
        enum: Object.values(ChannelMessageTypeEnum_1.default).map(Number)
    },
    content: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1024
    },
    user: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "User",
        required: true,
    },
    channel: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "Channel",
        required: true,
    },
    repliedTo: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "ChannelMessage",
        default: null,
    },
    deleted: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });
channelMessageSchema.pre("save", async function (next) {
    this.wasNew = this.isNew;
    try {
        if (this.isModified("content"))
            await PostAttachment_1.default.updateAttachments(this.content, { channelMessage: this._id });
        if (!this.isNew) {
            const participants = await ChannelParticipant_1.default.find({ channel: this.channel }, "user").lean();
            if (this.isModified("content")) {
                const userIds = participants.map(x => x.user);
                const io = (0, socketServer_1.getIO)();
                if (io) {
                    const attachments = await PostAttachment_1.default.getByPostId({ channelMessage: this._id });
                    io.to(userIds.map(x => (0, socketServer_1.uidRoom)(x.toString()))).emit("channels:message_edited", {
                        messageId: this._id.toString(),
                        channelId: this.channel.toString(),
                        content: this.content,
                        attachments,
                        updatedAt: new Date()
                    });
                }
            }
            else if (this.isModified("deleted") && this.deleted == true) {
                const io = (0, socketServer_1.getIO)();
                if (io) {
                    const userIds = participants.map(x => x.user);
                    io.to(userIds.map(x => (0, socketServer_1.uidRoom)(x.toString()))).emit("channels:message_deleted", {
                        messageId: this._id.toString(),
                        channelId: this.channel.toString()
                    });
                }
            }
        }
    }
    catch (err) {
        console.log("channelMessageSchema.pre(save) failed:", err.message);
    }
    finally {
        next();
    }
});
channelMessageSchema.post("save", async function () {
    try {
        if (this.wasNew) {
            const channel = await Channel_1.default.findById(this.channel);
            if (!channel)
                return;
            channel.lastMessage = this._id;
            await channel.save();
            await ChannelParticipant_1.default.updateMany({
                channel: this.channel,
                user: { $ne: this.user },
                $or: [
                    { lastActiveAt: null },
                    { lastActiveAt: { $lt: this.createdAt } }
                ]
            }, { $inc: { unreadCount: 1 } });
            const user = await User_1.default.findById(this.user, "name avatarImage level roles").lean();
            if (!user)
                return;
            const participants = await ChannelParticipant_1.default.find({ channel: this.channel }, "user muted unreadCount").lean();
            await Notification_1.default.sendToUsers(participants
                .filter(p => p.user.toString() !== user._id.toString() && !p.muted && (!p.unreadCount || p.unreadCount <= 1))
                .map(p => p._id), {
                title: "New message",
                type: NotificationTypeEnum_1.default.CHANNELS,
                actionUser: user._id,
                message: channel._type == ChannelTypeEnum_1.default.DM ? user.name + " sent you message" : " New messages in group " + channel.title,
                url: "/Channels/" + channel._id
            }, true);
            const io = (0, socketServer_1.getIO)();
            if (io) {
                const attachments = await PostAttachment_1.default.getByPostId({ channelMessage: this._id });
                let channelTitle = "";
                const userIds = participants.map(x => x.user);
                const userIdsNotMuted = participants.filter(x => !x.muted).map(x => x.user);
                if (this._type == ChannelMessageTypeEnum_1.default.USER_LEFT) {
                    userIds.push(user._id);
                }
                else if (this._type == ChannelMessageTypeEnum_1.default.TITLE_CHANGED) {
                    channelTitle = channel.title;
                }
                const reply = this.repliedTo ?
                    await ChannelMessage.findById(this.repliedTo)
                        .populate("user", "name avatarImage level roles")
                        .lean() : null;
                io.to(userIds.map(x => (0, socketServer_1.uidRoom)(x.toString()))).emit("channels:new_message", {
                    id: this._id,
                    type: this._type,
                    channelId: this.channel.toString(),
                    channelTitle,
                    content: this.content,
                    createdAt: this.createdAt,
                    updatedAt: this.updatedAt,
                    userId: user._id.toString(),
                    userName: user.name,
                    userAvatar: user.avatarImage,
                    viewed: false,
                    deleted: this.deleted,
                    repliedTo: reply ? {
                        id: reply._id,
                        content: (0, StringUtils_1.truncate)(reply.content, 50),
                        createdAt: reply.createdAt,
                        updatedAt: reply.updatedAt,
                        userId: reply.user._id.toString(),
                        userName: reply.user.name,
                        userAvatar: reply.user.avatarImage,
                        deleted: reply.deleted
                    } : null,
                    attachments
                });
                io.to(userIdsNotMuted.map(x => (0, socketServer_1.uidRoom)(x.toString()))).emit("channels:new_message_info", {});
            }
        }
    }
    catch (err) {
        console.log("channelMessageSchema.post(save) failed:", err.message);
    }
    finally {
    }
});
const ChannelMessage = mongoose_1.default.model("ChannelMessage", channelMessageSchema);
exports.default = ChannelMessage;
