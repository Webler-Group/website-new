"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const fileSchema = new mongoose_1.Schema({
    author: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    path: {
        type: String,
        required: true,
        trim: true,
        index: true,
        maxLength: 200
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 80
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    contenthash: {
        type: String,
        required: true,
        unique: true,
        index: true
    }
}, { timestamps: true });
const File = (0, mongoose_1.model)("File", fileSchema);
exports.default = File;
