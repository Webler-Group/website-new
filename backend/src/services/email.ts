import nodemailer from 'nodemailer';
import { config } from '../confg';
import { logEvents } from '../middleware/logger';
import { escapeHtml } from '../utils/regexUtils';

const mailTransport = nodemailer.createTransport({
    host: config.emailHost,
    port: config.emailPort,
    secure: config.emailSecure,
    auth: {
        user: config.emailUser,
        pass: config.emailPassword
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
const sendMail = async (to: string[] | string, subject: string, html: string): Promise<void> => {
    const mailOptions = {
        from: `Webler Codes Team <${config.emailUser}>`,
        to,
        subject,
        html
    };
    
    try {
        await mailTransport.sendMail(mailOptions);
    } catch(error: any) {
        logEvents(error.stack, "emailLog.log");
    }
}

const footer = `<small>&copy; ${(new Date).getFullYear()} Webler Codes. All rights reserved.</small>`;

const sendPasswordResetEmail = async (userName: string, userEmail: string, userId: string, emailToken: string) => {
    const resetLink = `${config.allowedOrigins[0]}/Users/Reset-Password?id=${userId}&token=${emailToken}`;
    
    const html = `
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Password Reset</h2>
                <p>Hello ${escapeHtml(userName)},</p>
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
}

const sendActivationEmail = async (userName: string, userEmail: string, userId: string, emailToken: string) => {
    const activationLink = `${config.allowedOrigins[0]}/Users/Activate?id=${userId}&token=${emailToken}`;

    const html = `
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Account Activation</h2>
                <p>Welcome ${escapeHtml(userName)},</p>
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
}

const sendEmailChangeVerification = async (userName: string, userEmail: string, newEmail: string, verificationCode: string) => {
    const html = `
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2>Email Change Verification</h2>
                <p>Hello ${escapeHtml(userName)},</p>
                <p>You have requested to change your email address to ${escapeHtml(newEmail)}.</p>
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
}

export {
    sendMail,
    sendPasswordResetEmail,
    sendActivationEmail,
    sendEmailChangeVerification
}