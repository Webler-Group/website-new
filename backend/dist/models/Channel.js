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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
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
const Channel = mongoose_1.default.model("Channel", channelSchema);
exports.default = Channel;
// // The channel model designed here is general-purpose, that means it can be used for one way channels, group chats, and direct messages plus maintaining features like sending announcements by the server
// // The model assumes no User and Chat gets deleted from databse.
// // detaild and extensible permissions, by default they are set for an ideal and mature group chat.
// const permissions = {
//     canSendText: {
//         type: Boolean,
//         default: true,
//     },
//     canSendImage: {
//         type: Boolean,
//         default: true,
//     },
//     canSendVoice: {
//         type: Boolean,
//         default: true,
//     },
//     canSendVideo: {
//         type: Boolean,
//         default: true,
//     },
//     canSendCode: {
//         type: Boolean,
//         default: true,
//     },
//     canSendPost: {
//         type: Boolean,
//         default: true,
//     },
//     canSendExternalLink: {
//         type: Boolean,
//         default: true,
//     },
//     // The following permissions for deletions are for without clean up from the database. footage will be visible
//     canDeleteChat: {
//         type: Boolean,
//         default: true,
//     },
//     canDeleteParticipant: {
//         type: Boolean,
//         default: true,
//     },
//     canDeleteOwnMessage: {
//         type: Boolean,
//         default: true,
//     },
//     canDeleteOthersMessage: {
//         type: Boolean,
//         default: true,
//     },
//     canSeeParticipantsList: {
//         type: Boolean,
//         default: true,
//     },
//     canSeeMessages: {
//         type: Boolean,
//         default: true,
//     },
//     // The following permissions for deletions of footage
//     //The following permissions for deletions are for clean up from the databse
// }
// // Every message can be handled differently by the server.
// // A message can be removed from the database without any problems as it was never sent (e.g. erasing any trace to an account).
// // But it also can be removed from the channel without that. it can be determined whther the footage of a deleted message is visible or not.
// // A participant might be removed from the channel with or without deleting their messages. 
// // Attachements are included by their links, which are fetched and displayed by client side.
// // Replied messages are considred attachments and there is no internal links between messages.
// // For now, a message is dependent on a channel for its exitense on the database.
// const channelMessageSchema = new Schema({
//     content: {
//         type: String,
//         required: true,
//         trim: true,
//         minLength: 1,
//         maxLength: 2048
//     },
//     sender: {
//         type: SchemaTypes.ObjectId, // Can point to a non participant
//         ref: "User",
//         required: true,
//     },
//     hidden: { // in case of deleting by someone with the privilege.
//         type: Boolean,
//         default: false,
//     },
//     hiddenFootage: {
//         type: Boolean,
//         default: false,
//     },
//     hiddenSender: {
//         type: Boolean,
//         default: false,
//     },
//     channel: {
//         type: SchemaTypes.ObjectId,
//         ref: "Channel",
//         required: true,
//     }
// }, { timestamps: true });
// const channelSchema = new Schema({
//     permissions: [{
//         user: {
//             type: SchemaTypes.ObjectId,
//             ref: "User",
//             required: true
//         },
//         permissions,
//     }],
//     defaultPermissions: permissions,
//     participants: [{
//         type: SchemaTypes.ObjectId,
//         ref: "User",
//     }],
//     createdBy: {
//         type: SchemaTypes.ObjectId,
//         ref: "User",
//         required: true,
//     },
//     pinnedMessages: [{
//         type: SchemaTypes.ObjectId,
//         ref: "ChannelMessage",
//     }],
//     channelName: {
//         type: String,
//         trim: true,
//         minLength: 4,
//         maxLength: 128
//     },
//     channelIcon: {
//         type: String,
//         default: "/resources/images/group_chat.png",
//         trim: true,
//         minLength: 1,
//         maxLength: 1024
//     },
// }, { timestamps: true });
// declare interface IChannelMessage extends InferSchemaType<typeof channelMessageSchema> { }
// export const ChannelMessage = mongoose.model<IChannelMessage>("ChannelMessage", channelMessageSchema);
// declare interface IChannel extends InferSchemaType<typeof channelSchema> { }
// channelSchema.statics.getPermissions = async function (channelId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
//     const permissions = await Channel.findOne({ participants: { $in: userId }, _id: channelId }).select("defaultPermissions permissions");
//     if (!permissions) throw "no such channel with such a user exists";
//     const i = permissions.permissions.findIndex((v: any) => {
//         return v.user == userId;
//     });
//     if (i < 0) return { ...permissions.defaultPermissions };
//     return { ...permissions.defaultPermissions, ...permissions.permissions[i] };
// }
// channelSchema.statics.isParticipantOf = async function (channelId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId) {
//     const n = await Channel.countDocuments({ participants: { $in: userId }, _id: channelId });
//     return n === 1;
// }
// interface ChannelModel extends Model<IChannel> {
//     getPermissions(channelId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<{ [K in keyof typeof permissions]: boolean }>;
//     isParticipantOf(channelId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<boolean>; // used only for authentication
// }
// export const Channel = mongoose.model<IChannel, ChannelModel>("Channel", channelSchema);
