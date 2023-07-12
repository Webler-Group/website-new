"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const countrySchema = new mongoose_1.default.Schema({
    code: {
        required: true,
        type: String
    }
}, {
    timestamps: true
});
const Country = mongoose_1.default.model('Country', countrySchema);
exports.default = Country;
