import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    notifications: {
        followers: { type: Boolean, default: true },
        codes: { type: Boolean, default: true },
        discuss: { type: Boolean, default: true },
        channels: { type: Boolean, default: true },
    }
});

const UserSettings = mongoose.model("UserSettings", userSettingsSchema);

export default UserSettings;