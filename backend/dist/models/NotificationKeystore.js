"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const notificationKeystoreSchema = new mongoose_1.Schema({
    version: {
        type: String,
        enum: ["old", "active", "candidate"],
        required: true,
        unique: true
    },
    publicKey: { type: String, required: true },
    privateKey: { type: String, required: true },
}, {
    timestamps: true
});
const NotificationKeystore = (0, mongoose_1.model)("PushKeystore", notificationKeystoreSchema);
exports.default = NotificationKeystore;
