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
exports.sendActivationEmail = exports.sendPasswordResetEmail = exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const confg_1 = require("../confg");
const logger_1 = require("../middleware/logger");
const mailTransport = nodemailer_1.default.createTransport({
    host: confg_1.config.emailHost,
    port: confg_1.config.emailPort,
    secure: confg_1.config.emailSecure,
    auth: {
        user: confg_1.config.emailUser,
        pass: confg_1.config.emailPassword
    },
    debug: false,
    logger: true
});
/**
 * Sends email to given recipients from system address
 *
 * @param to Array of email recipients
 * @param subject Email subject
 * @param html Email content in HTML format
 */
const sendMail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    const mailOptions = {
        from: `Webler Codes Team <${confg_1.config.emailUser}>`,
        to,
        subject,
        html
    };
    try {
        yield mailTransport.sendMail(mailOptions);
    }
    catch (error) {
        (0, logger_1.logEvents)(error.stack, "emailLog.log");
    }
});
exports.sendMail = sendMail;
const sendPasswordResetEmail = (userName, userEmail, userId, emailToken) => __awaiter(void 0, void 0, void 0, function* () {
    const resetLink = `${confg_1.config.allowedOrigins[0]}/Users/Reset-Password?id=${userId}&token=${emailToken}`;
    const html = `
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Password Reset</h2>
                <p>Hello ${userName},</p>
                <p>Forgot your password or want to change it? You can set a new password by clicking on the following link:</p>
                <p><a href="${resetLink}" style="color: #007bff;">Reset your password</a></p>
                <p>Keep Coding,</p>
                <p>Your Webler Team</p>
                <hr />
                <small>&copy; ${(new Date).getFullYear()} Webler Inc. All rights reserved.</small>
            </body>
        </html>
    `;
    return yield sendMail(userEmail, "Password Reset", html);
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendActivationEmail = (userName, userEmail, userId, emailToken) => __awaiter(void 0, void 0, void 0, function* () {
    const activationLink = `${confg_1.config.allowedOrigins[0]}/Users/Activate?id=${userId}&token=${emailToken}`;
    const html = `
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Account Activation</h2>
                <p>Welcome ${userName},</p>
                <p>Thanks for joining Webler! Click the link below to verify your email address and activate your account:</p>
                <p><a href="${activationLink}" style="color: #007bff;">Activate your account</a></p>
                <p>Keep Coding,</p>
                <p>Your Webler Team</p>
                <hr />
                <small>&copy; ${(new Date).getFullYear()} Webler Inc. All rights reserved.</small>
            </body>
        </html>
    `;
    return yield sendMail(userEmail, `${userName}, activate your Webler account!`, html);
});
exports.sendActivationEmail = sendActivationEmail;
