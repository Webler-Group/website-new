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
const pushService_1 = require("../services/pushService");
const channelMessageSchema = new mongoose_1.Schema({
    /*
    1 - Basic
    2 - System: user joined
    3 - System: user left
    4 - System: user changed title
    */
    _type: {
        type: Number,
        required: true
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
    deleted: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });
channelMessageSchema.pre("save", async function (next) {
    this.wasNew = this.isNew;
    if (this.isModified("content"))
        await PostAttachment_1.default.updateAttachments(this.content, { channelMessage: this._id });
    if (!this.isNew) {
        const participants = await ChannelParticipant_1.default.find({ channel: this.channel }, "user").lean();
        if (this.isModified("content")) {
            const userIds = participants.map(x => x.user);
            const io = (0, socketServer_1.getIO)();
            if (io) {
                io.to(userIds.map(x => (0, socketServer_1.uidRoom)(x.toString()))).emit("channels:message_edited", {
                    messageId: this._id.toString(),
                    channelId: this.channel.toString(),
                    content: this.content
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
    next();
});
channelMessageSchema.post("save", async function () {
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
        await (0, pushService_1.sendToUsers)(participants
            .filter(p => p.user.toString() !== user._id.toString() && !p.muted && (!p.unreadCount || p.unreadCount <= 1))
            .map(p => p.user.toString()), {
            title: "New message",
            body: channel._type == 1 ? user.name + " sent you message" : " New messages in group " + channel.title,
            url: "/Channels/" + channel._id
        }, "channels");
        const io = (0, socketServer_1.getIO)();
        if (io) {
            const attachments = await PostAttachment_1.default.getByPostId({ channelMessage: this._id });
            let channelTitle = "";
            const userIds = participants.map(x => x.user);
            const userIdsNotMuted = participants.filter(x => !x.muted).map(x => x.user);
            if (this._type == 3) {
                userIds.push(user._id);
            }
            else if (this._type == 4) {
                channelTitle = channel.title;
            }
            io.to(userIds.map(x => (0, socketServer_1.uidRoom)(x.toString()))).emit("channels:new_message", {
                id: this._id,
                type: this._type,
                channelId: this.channel.toString(),
                channelTitle,
                content: this.content,
                createdAt: this.createdAt,
                userId: user._id.toString(),
                userName: user.name,
                userAvatar: user.avatarImage,
                viewed: false,
                deleted: this.deleted,
                attachments
            });
            io.to(userIdsNotMuted.map(x => (0, socketServer_1.uidRoom)(x.toString()))).emit("channels:new_message_info", {});
        }
        return;
    }
});
const ChannelMessage = mongoose_1.default.model("ChannelMessage", channelMessageSchema);
exports.default = ChannelMessage;
