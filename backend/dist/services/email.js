"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailChangeVerification = exports.sendActivationEmail = exports.sendPasswordResetEmail = exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const confg_1 = require("../confg");
const logger_1 = require("../middleware/logger");
const regexUtils_1 = require("../utils/regexUtils");
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
        from: `Webler Codes Team <${confg_1.config.emailUser}>`,
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
const footer = `<small>&copy; ${(new Date).getFullYear()} Webler Codes. All rights reserved.</small>`;
const sendPasswordResetEmail = async (userName, userEmail, userId, emailToken) => {
    const resetLink = `${confg_1.config.allowedOrigins[0]}/Users/Reset-Password?id=${userId}&token=${emailToken}`;
    const html = `
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Password Reset</h2>
                <p>Hello ${(0, regexUtils_1.escapeHtml)(userName)},</p>
                <p>Forgot your password or want to change it? You can set a new password by clicking on the following link:</p>
                <p><a href="${resetLink}" style="color: #007bff;">Reset your password</a></p>
                <p>Keep Coding,</p>
                <p>Your Webler Codes team</p>
                <hr />
                ${footer}
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
                <p>Welcome ${(0, regexUtils_1.escapeHtml)(userName)},</p>
                <p>Thanks for joining Webler Codes! Click the link below to verify your email address and activate your account:</p>
                <p><a href="${activationLink}" style="color: #007bff;">Activate your account</a></p>
                <p>Keep Coding,</p>
                <p>Your Webler Codes team</p>
                <hr />
                ${footer}
            </body>
        </html>
    `;
    return await sendMail(userEmail, `${userName}, activate your Webler Codes account!`, html);
};
exports.sendActivationEmail = sendActivationEmail;
const sendEmailChangeVerification = async (userName, userEmail, newEmail, verificationCode) => {
    const html = `
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Email Change Verification</h2>
                <p>Hello ${(0, regexUtils_1.escapeHtml)(userName)},</p>
                <p>You have requested to change your email address to ${(0, regexUtils_1.escapeHtml)(newEmail)}.</p>
                <p>To confirm this change, please use the following verification code:</p>
                <p style="font-size: 24px; font-weight: bold;">${verificationCode}</p>
                <p>If you did not request this change, please ignore this email or contact support.</p>
                <p>Keep Coding,</p>
                <p>Your Webler Codes team</p>
                <hr />
                ${footer}
            </body>
        </html>
    `;
    return await sendMail(userEmail, "Verify Your Email Change", html);
};
exports.sendEmailChangeVerification = sendEmailChangeVerification;
