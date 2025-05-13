import nodemailer from 'nodemailer';
import { config } from '../confg';

const transport =
    {
        service: "gmail",
        auth: {
            user: "",
            pass: "",
        },
    };

const transporter = nodemailer.createTransport(transport);

const sendPasswordResetEmail = async (userName: string, userEmail: string, userId: string, emailToken: string) => {

    let text = `Password reset
    
Hello ${userName},

Forgot your password or want to change it? You can set a new password by clicking on the following link:

${config.homeUrl}Users/Reset-Password?id=${userId}&token=${emailToken}

Keep Coding,

Your Webler Team

© ${(new Date).getFullYear()} Webler Inc. All rights reserved.`

    const result = await transporter.sendMail({
        to: userEmail,
        from: '"Webler" <info@' + config.domainName + '>',
        subject: "Password reset",
        text
    });
    return result
}

const sendActivationEmail = async (userName: string, userEmail: string, userId: string, emailToken: string) => {

    let text = `Account activation
    
Welcome ${userName},

Thanks for joining Webler! Click the link below to verify your email address and activate your account.

${config.homeUrl}Users/Activate?id=${userId}&token=${emailToken}

Keep Coding,

Your Webler Team

© ${(new Date).getFullYear()} Webler Inc. All rights reserved.`

    const result = await transporter.sendMail({
        to: userEmail,
        from: '"Webler" <info@' + config.domainName + '>',
        subject: userName + ", activate your Webler account!",
        text
    });
    return result
}

export {
    sendPasswordResetEmail,
    sendActivationEmail
}