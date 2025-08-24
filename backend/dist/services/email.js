"use strict";
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
const sendMail = async (to, subject, html) => {
    const mailOptions = {
        from: `WeblerCodes Team <${confg_1.config.emailUser}>`,
        to,
        subject,
        html
    };
    try {
        await mailTransport.sendMail(mailOptions);
    }
    catch (error) {
        (0, logger_1.logEvents)(error.stack, "emailLog.log");
    }
};
exports.sendMail = sendMail;
const sendPasswordResetEmail = async (userName, userEmail, userId, emailToken) => {
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
    return await sendMail(userEmail, "Password Reset", html);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendActivationEmail = async (userName, userEmail, userId, emailToken) => {
    const activationLink = `${confg_1.config.allowedOrigins[0]}/Users/Activate?id=${userId}&token=${emailToken}`;
    const html = `
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Account Activation</h2>
                <p>Welcome ${userName},</p>
                <p>Thanks for joining WeblerCodes! Click the link below to verify your email address and activate your account:</p>
                <p><a href="${activationLink}" style="color: #007bff;">Activate your account</a></p>
                <p>Keep Coding,</p>
                <p>Your WeblerCodes Team</p>
                <hr />
                <small>&copy; ${(new Date).getFullYear()} Webler Inc. All rights reserved.</small>
            </body>
        </html>
    `;
    return await sendMail(userEmail, `${userName}, activate your WeblerCodes account!`, html);
};
exports.sendActivationEmail = sendActivationEmail;
