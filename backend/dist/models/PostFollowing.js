"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const postFollowingSchema = new mongoose_1.default.Schema({
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    },
    following: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "Post",
        required: true
    }
});
const PostFollowing = mongoose_1.default.model("PostFollowing", postFollowingSchema);
exports.default = PostFollowing;
