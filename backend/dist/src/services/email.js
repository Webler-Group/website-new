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
exports.sendActivationEmail = exports.sendPasswordResetEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const confg_1 = require("../confg");
const transport = {
    service: "gmail",
    auth: {
        user: "",
        pass: "",
    },
};
const transporter = nodemailer_1.default.createTransport(transport);
const sendPasswordResetEmail = (userName, userEmail, userId, emailToken) => __awaiter(void 0, void 0, void 0, function* () {
    let text = `Password reset
    
Hello ${userName},

Forgot your password or want to change it? You can set a new password by clicking on the following link:

${confg_1.config.homeUrl}Users/Reset-Password?id=${userId}&token=${emailToken}

Keep Coding,

Your Webler Team

© ${(new Date).getFullYear()} Webler Inc. All rights reserved.`;
    const result = yield transporter.sendMail({
        to: userEmail,
        from: '"Webler" <info@' + confg_1.config.domainName + '>',
        subject: "Password reset",
        text
    });
    return result;
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendActivationEmail = (userName, userEmail, userId, emailToken) => __awaiter(void 0, void 0, void 0, function* () {
    let text = `Account activation
    
Welcome ${userName},

Thanks for joining Webler! Click the link below to verify your email address and activate your account.

${confg_1.config.homeUrl}Users/Activate?id=${userId}&token=${emailToken}

Keep Coding,

Your Webler Team

© ${(new Date).getFullYear()} Webler Inc. All rights reserved.`;
    const result = yield transporter.sendMail({
        to: userEmail,
        from: '"Webler" <info@' + confg_1.config.domainName + '>',
        subject: userName + ", activate your Webler account!",
        text
    });
    return result;
});
exports.sendActivationEmail = sendActivationEmail;
