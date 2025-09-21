import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import User from "../models/User";
import { RefreshTokenPayload, clearRefreshToken, generateRefreshToken, signAccessToken, signEmailToken } from "../utils/tokenUtils";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendActivationEmail, sendPasswordResetEmail } from "../services/email";
import { getCaptcha, verifyCaptcha } from "../utils/captcha";
import CaptchaRecord from "../models/CaptchaRecord";
import { config } from "../confg";
import { parseWithZod } from "../utils/zodUtils";
import { loginSchema, refreshSchema, registerSchema, resetPasswordSchema, sendPasswordResetCodeSchema, verifyEmailSchema } from "../validation/authSchema";
import UserFollowing from "../models/UserFollowing";

const login = asyncHandler(async (req, res) => {
    const {
        body,
        headers
    } = parseWithZod(loginSchema, req);
    const { email, password } = body;

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
        res.status(401).json({ error: [{ message: "Invalid email or password" }] });
        return;
    }

    if (!user.active) {
        res.status(401).json({ error: [{ message: "Account is deactivated" }] });
        return;
    }

    user.lastLoginAt = new Date();

    const { accessToken, data: tokenInfo } = await signAccessToken({
        userId: user._id.toString(),
        roles: user.roles
    }, headers["x-device-id"]);

    const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
        (tokenInfo as JwtPayload).exp! * 1000 : 0;

    await generateRefreshToken(res, { userId: user._id.toString() });

    res.json({
        accessToken,
        expiresIn,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatarImage: user.avatarImage,
            roles: user.roles,
            emailVerified: user.emailVerified,
            countryCode: user.countryCode,
            registerDate: user.createdAt,
            level: user.level,
            xp: user.xp
        }
    })

})

const register = asyncHandler(async (req: Request, res: Response) => {
    const { body, headers } = parseWithZod(registerSchema, req);
    const { email, name, password, solution, captchaId } = body;

    const record = await CaptchaRecord.findById(captchaId).lean();

    if (record === null || !verifyCaptcha(solution, record.encrypted)) {
        res.status(403).json({ error: [{ message: "Captcha verification failed" }] });
        return;
    }

    await CaptchaRecord.deleteOne({ _id: captchaId });

    const emailExists = await User.exists({ email });
    const usernameExists = await User.exists({ name });
    if (emailExists || usernameExists) {
        let errors: { message: string; }[] = [];
        if (emailExists) {
            errors.push({ message: "Email is already registered" });
        }
        if (usernameExists) {
            errors.push({ message: "Username is already used" });
        }
        res.status(400).json({ error: errors });
        return;
    }

    const user = await User.create({
        email,
        name,
        password,
        emailVerified: config.nodeEnv == "development",
        lastLoginAt: new Date()
    });

    const { accessToken, data: tokenInfo } = await signAccessToken({
        userId: user._id.toString(),
        roles: user.roles
    }, headers["x-device-id"]);

    const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
        (tokenInfo as JwtPayload).exp! * 1000 : 0;

    await generateRefreshToken(res, { userId: user._id.toString() });

    if (config.nodeEnv === "production") {
        const { emailToken } = signEmailToken({
            userId: user._id.toString(),
            email: user.email,
            action: "verify-email"
        });

        try {
            await sendActivationEmail(user.name, user.email, user._id.toString(), emailToken);

            user.lastVerificationEmailTimestamp = Date.now();
            await user.save();
        }
        catch (err: any) {
            console.log("Activation email error:", err.message);
        }
    }

    const weblercodesUser = await User.exists({ email: config.adminEmail });
    if(weblercodesUser) {
        await UserFollowing.create({ user: user._id, following: weblercodesUser._id });
    }

    res.json({
        accessToken,
        expiresIn,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatarImage: user.avatarImage,
            roles: user.roles,
            emailVerified: user.emailVerified,
            countryCode: user.countryCode,
            registerDate: user.createdAt,
            level: user.level,
            xp: user.xp
        }
    });
});

const logout = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies;

    if (cookies?.refreshToken) {
        clearRefreshToken(res);
    }
    res.json({});
})

const refresh = asyncHandler(async (req: Request, res: Response) => {
    const { headers, cookies } = parseWithZod(refreshSchema, req);

    jwt.verify(
        cookies.refreshToken,
        config.refreshTokenSecret,
        async (err: VerifyErrors | null, decoded: any) => {
            if (err) {
                res.status(403).json({ error: [{ message: "Please Login First" }] });
                return
            }

            const payload = decoded as RefreshTokenPayload;
            const user = await User.findById(payload.userId).select('roles active tokenVersion');

            if (!user || !user.active || payload.tokenVersion !== user.tokenVersion) {  // NEW: Check version
                res.status(401).json({ error: [{ message: "Unauthorized" }] });
                return
            }

            const { accessToken, data: tokenInfo } = await signAccessToken({
                userId: user._id.toString(),
                roles: user.roles
            }, headers["x-device-id"]);

            const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
                (tokenInfo as JwtPayload).exp! * 1000 : 0;

            res.json({
                accessToken,
                expiresIn
            })
        }
    );
})

const sendPasswordResetCode = asyncHandler(async (req: Request, res: Response) => {
    const { body } = parseWithZod(sendPasswordResetCodeSchema, req);
    const { email } = body;

    const user = await User.findOne({ email }).lean();

    if (user === null) {
        res.status(404).json({ error: [{ message: "Email is not registered" }] });
        return
    }

    const { emailToken } = signEmailToken({
        userId: user._id.toString(),
        email: user.email,
        action: "reset-password"
    })

    try {
        await sendPasswordResetEmail(user.name, user.email, user._id.toString(), emailToken);

        res.json({ success: true })
    }
    catch (err: any) {
        console.log("REset email error:", err.message);
        res.status(500).json({ error: [{ message: "Email could not be sent" }] });

    }

})

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { body } = parseWithZod(resetPasswordSchema, req);
    const { token, password, resetId } = body;

    jwt.verify(
        token,
        config.emailTokenSecret,
        async (err: VerifyErrors | null, decoded: any) => {
            if (!err) {
                const userId = decoded.userId as string;

                if (userId !== resetId || decoded.action != "reset-password") {
                    res.json({ error: [{ message: "Unauthorized" }] });
                    return
                }

                const user = await User.findById(resetId);

                if (user === null) {
                    res.status(404).json({ error: [{ message: "User not found" }] })
                    return
                }

                user.password = password;
                user.tokenVersion = (user.tokenVersion || 0) + 1;

                await user.save();

                const cookies = req.cookies;

                if (cookies?.refreshToken) {
                    clearRefreshToken(res);
                }

                res.json({ success: true });
            }
            else {
                res.json({ error: [{ message: "Invalid token" }] });
            }
        }
    )

})

const generateCaptcha = asyncHandler(async (req: Request, res: Response) => {
    const { base64ImageDataURI, encrypted } = await getCaptcha();

    const record = await CaptchaRecord.create({ encrypted });

    const date = new Date(Date.now() - 15 * 60 * 1000);
    await CaptchaRecord.deleteMany({ createdAt: { $lt: date } });

    res.json({
        captchaId: record._id,
        imageData: base64ImageDataURI,
    });
})

const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { body } = parseWithZod(verifyEmailSchema, req);
    const { token, userId } = body;

    jwt.verify(
        token,
        config.emailTokenSecret,
        async (err: VerifyErrors | null, decoded: any) => {
            if (!err) {
                const userId2 = decoded.userId as string;
                const email = decoded.email as string;

                if (userId2 !== userId || decoded.action != "verify-email") {
                    res.json({ error: [{ message: "Unauthorized" }] });
                    return;
                }

                const user = await User.findById(userId);

                if (user === null) {
                    res.status(404).json({ error: [{ message: "User not found" }] })
                    return;
                }

                if (user.email !== email) {
                    res.json({ error: [{ message: "Unauthorized" }] });
                    return;
                }

                user.emailVerified = true;

                await user.save();

                res.json({ success: true });
            }
            else {
                res.json({ error: [{ message: "Invalid token" }] });
            }
        }
    )

})

const controller = {
    login,
    register,
    logout,
    refresh,
    sendPasswordResetCode,
    resetPassword,
    generateCaptcha,
    verifyEmail
};

export default controller;