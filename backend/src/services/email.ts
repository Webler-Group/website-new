import nodemailer from 'nodemailer';
import { config } from '../confg';
import { logEvents } from '../middleware/logger';

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
        from: `WeblerCodes Team <${config.emailUser}>`,
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

const sendPasswordResetEmail = async (userName: string, userEmail: string, userId: string, emailToken: string) => {
    const resetLink = `${config.allowedOrigins[0]}/Users/Reset-Password?id=${userId}&token=${emailToken}`;
    
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
}

const sendActivationEmail = async (userName: string, userEmail: string, userId: string, emailToken: string) => {
    const activationLink = `${config.allowedOrigins[0]}/Users/Activate?id=${userId}&token=${emailToken}`;

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
}


export {
    sendMail,
    sendPasswordResetEmail,
    sendActivationEmail
}