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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
const channelMessageSchema = new mongoose_1.Schema({
    /*
    1 - Basic
    2 - System: user joined
    3 - System: user left
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
channelMessageSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified("content")) {
            next();
            return;
        }
        yield PostAttachment_1.default.updateAttachments(this.content, { channelMessage: this._id });
    });
});
channelMessageSchema.post("save", function () {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        yield Channel_1.default.updateOne({ _id: this.channel }, { lastMessage: this._id });
        const io = (0, socketServer_1.getIO)();
        if (io) {
            const user = yield User_1.default.findById(this.user, "name avatarImage level roles").lean();
            if (!user)
                return;
            const attachments = yield PostAttachment_1.default.getByPostId({ channelMessage: this._id });
            let channelTitle = undefined;
            const userIds = (yield ChannelParticipant_1.default.find({ channel: this.channel }, "user").lean()).map(x => x.user);
            if (this._type == 3) {
                userIds.push(user._id);
            }
            else if (this._type == 4) {
                channelTitle = (_a = (yield Channel_1.default.findById(this.channel, "title").lean())) === null || _a === void 0 ? void 0 : _a.title;
            }
            const rooms = userIds.map(x => (0, socketServer_1.uidRoom)(x.toString()));
            io.to(rooms).emit("channels:new_message", {
                type: this._type,
                channelId: this.channel.toString(),
                channelTitle,
                content: this.content,
                createdAt: this.createdAt,
                userId: user._id.toString(),
                userName: user.name,
                userAvatar: user.avatarImage,
                viewed: false,
                attachments
            });
        }
    });
});
const ChannelMessage = mongoose_1.default.model("ChannelMessage", channelMessageSchema);
exports.default = ChannelMessage;
