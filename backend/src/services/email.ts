import nodemailer from 'nodemailer';

const transport = process.env.NODE_ENV === "development" ?
    {
        service: "gmail",
        auth: {
            user: process.env.TEST_EMAIL_USER as string,
            pass: process.env.TEST_EMAIL_PASSWORD as string,
        },
    }
    :
    {
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail',
        secure: true,
        dkim: {
            domainName: process.env.DOMAIN_NAME as string,
            keySelector: process.env.DKIM_KEY_SELECTOR as string, // The key you used in your DKIM TXT DNS Record
            privateKey: process.env.DKIM_PRIVATE_KEY as string, // Content of you private key
        }
    }

const transporter = nodemailer.createTransport(transport);

const sendPasswordResetEmail = async (userName: string, userEmail: string, userId: string, emailToken: string) => {

    let text = `Password reset
    
Hello ${userName},

Forgot your password or want to change it? You can set a new password by clicking on the following link:

${process.env.HOME_URL as string}Users/Reset-Password?id=${userId}&token=${emailToken}

Keep Coding,

Your Webler Team

© ${(new Date).getFullYear()} Webler Inc. All rights reserved.`

    const result = await transporter.sendMail({
        to: userEmail,
        from: '"Webler" <info@' + (process.env.DOMAIN_NAME as string) + '>',
        subject: "Password reset",
        text
    });
    return result
}

export {
    sendPasswordResetEmail
}