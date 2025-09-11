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
const ChannelParticipant_1 = __importDefault(require("./ChannelParticipant"));
const socketServer_1 = require("../config/socketServer");
const User_1 = __importDefault(require("./User"));
const Channel_1 = __importDefault(require("./Channel"));
const Notification_1 = __importDefault(require("./Notification"));
const ChannelTypeEnum_1 = __importDefault(require("../data/ChannelTypeEnum"));
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const ChannelMessage_1 = __importDefault(require("./ChannelMessage"));
const ChannelMessageTypeEnum_1 = __importDefault(require("../data/ChannelMessageTypeEnum"));
const channelInviteSchema = new mongoose_1.Schema({
    invitedUser: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "User",
        required: true
    },
    channel: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "Channel",
        required: true
    },
    author: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});
channelInviteSchema.post("save", async function () {
    const io = (0, socketServer_1.getIO)();
    if (io) {
        const author = await User_1.default.findById(this.author, "name avatarImage level roles").lean();
        const channel = await Channel_1.default.findById(this.channel, "title _type title");
        if (!author || !channel)
            return;
        await Notification_1.default.sendToUsers([this.invitedUser], {
            title: "New invite",
            message: `${author.name} invited you to ${channel._type == ChannelTypeEnum_1.default.DM ? "DM" : "group"}`,
            type: NotificationTypeEnum_1.default.CHANNELS,
            actionUser: author._id,
            url: "/Channels"
        }, true);
        io.to((0, socketServer_1.uidRoom)(this.invitedUser.toString())).emit("channels:new_invite", {
            id: this._id,
            authorId: author._id,
            authorName: author.name,
            authorAvatar: author.avatarImage,
            channelId: channel._id,
            channelType: channel._type,
            channelTitle: channel.title,
            createdAt: this.createdAt
        });
    }
});
channelInviteSchema.methods.accept = async function (accepted = true) {
    if (accepted) {
        await ChannelParticipant_1.default.create({ channel: this.channel, user: this.invitedUser });
        await ChannelMessage_1.default.create({
            _type: ChannelMessageTypeEnum_1.default.USER_JOINED,
            content: "{action_user} joined",
            channel: this.channel,
            user: this.invitedUser
        });
    }
    await ChannelInvite.deleteMany({ channel: this.channel, invitedUser: this.invitedUser });
};
const ChannelInvite = mongoose_1.default.model("ChannelInvite", channelInviteSchema);
exports.default = ChannelInvite;
