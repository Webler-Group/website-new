"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const tagSchema = new mongoose_1.default.Schema({
    name: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        maxLength: 64,
        minLength: 1
    }
});
tagSchema.statics.getOrCreateTagByName = async function (tagName) {
    let tag = await Tag.findOne({ name: tagName });
    if (tag === null) {
        tag = await Tag.create({ name: tagName });
    }
    return tag;
};
const Tag = mongoose_1.default.model("Tag", tagSchema);
exports.default = Tag;
