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
const ChannelInvite_1 = __importDefault(require("./ChannelInvite"));
const ChannelMessage_1 = __importDefault(require("./ChannelMessage"));
const channelSchema = new mongoose_1.Schema({
    /*
    1 - Direct Messages
    2 - Group
    */
    _type: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        trim: true,
        minLength: 3,
        maxLength: 20,
        required: false
    },
    createdBy: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "User",
        required: true
    },
    DMUser: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "User",
        default: null
    },
    lastMessage: {
        type: mongoose_1.SchemaTypes.ObjectId,
        ref: "ChannelMessage",
        default: null
    }
}, {
    timestamps: true
});
channelSchema.statics.deleteAndCleanup = async function (channelId) {
    // delete participants
    await ChannelParticipant_1.default.deleteMany({ channel: channelId });
    // delete invites
    await ChannelInvite_1.default.deleteMany({ channel: channelId });
    // delete messages
    await ChannelMessage_1.default.deleteMany({ channel: channelId });
    // finally delete channel itself
    await Channel.deleteOne({ _id: channelId });
};
const Channel = mongoose_1.default.model("Channel", channelSchema);
exports.default = Channel;
