import mongoose from "mongoose";

const captchaRecordScheme = new mongoose.Schema({
    encrypted: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const CaptchaRecord = mongoose.model("CaptchaRecord", captchaRecordScheme);

export default CaptchaRecord;