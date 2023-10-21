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
exports.sendPasswordResetEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transport = process.env.NODE_ENV === "development" ?
    {
        service: "gmail",
        auth: {
            user: process.env.TEST_EMAIL_USER,
            pass: process.env.TEST_EMAIL_PASSWORD,
        },
    }
    :
        {
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail',
            secure: true,
            dkim: {
                domainName: process.env.DOMAIN_NAME,
                keySelector: process.env.DKIM_KEY_SELECTOR,
                privateKey: process.env.DKIM_PRIVATE_KEY, // Content of you private key
            }
        };
const transporter = nodemailer_1.default.createTransport(transport);
const sendPasswordResetEmail = (userName, userEmail, userId, emailToken) => __awaiter(void 0, void 0, void 0, function* () {
    let text = `Password reset
    
Hello ${userName},

Forgot your password or want to change it? You can set a new password by clicking on the following link:

${process.env.HOME_URL}Users/Reset-Password?id=${userId}&token=${emailToken}

Keep Coding,

Your Webler Team

© ${(new Date).getFullYear()} Webler Inc. All rights reserved.`;
    const result = yield transporter.sendMail({
        to: userEmail,
        from: '"Webler" <info@' + process.env.DOMAIN_NAME + '>',
        subject: "Password reset",
        text
    });
    return result;
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
