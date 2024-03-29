"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const upvoteSchema = new mongoose_1.default.Schema({
    parentId: {
        type: mongoose_1.default.Types.ObjectId,
        required: true
    },
    user: {
        type: mongoose_1.default.Types.ObjectId,
        ref: "User",
        required: true
    }
});
const Upvote = mongoose_1.default.model("Upvote", upvoteSchema);
exports.default = Upvote;
