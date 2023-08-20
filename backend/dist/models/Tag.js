"use strict";
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
const mongoose_1 = __importDefault(require("mongoose"));
const isAlpha_1 = __importDefault(require("validator/lib/isAlpha"));
const tagSchema = new mongoose_1.default.Schema({
    name: {
        required: true,
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [(val) => (0, isAlpha_1.default)(val), "Tag can only contain letters"]
    }
});
tagSchema.statics.getOrCreateTagByName = function (tagName) {
    return __awaiter(this, void 0, void 0, function* () {
        let tag = yield Tag.findOne({ name: tagName });
        if (tag === null) {
            tag = yield Tag.create({ name: tagName });
        }
        return tag;
    });
};
const Tag = mongoose_1.default.model("Tag", tagSchema);
exports.default = Tag;
