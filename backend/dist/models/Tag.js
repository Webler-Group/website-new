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
tagSchema.statics.getOrCreateTagsByNames = async function (tagNames) {
    // Remove duplicates to avoid unnecessary queries
    const uniqueNames = [...new Set(tagNames)];
    // Find already existing tags
    const existingTags = await Tag.find({ name: { $in: uniqueNames } });
    const existingNames = existingTags.map(tag => tag.name);
    // Determine which names are missing
    const missingNames = uniqueNames.filter(name => !existingNames.includes(name));
    // Create missing tags (if any)
    const newTags = missingNames.length > 0
        ? await Tag.insertMany(missingNames.map(name => ({ name })))
        : [];
    // Return combined array of existing + new tags
    return [...existingTags, ...newTags];
};
const Tag = mongoose_1.default.model("Tag", tagSchema);
exports.default = Tag;
