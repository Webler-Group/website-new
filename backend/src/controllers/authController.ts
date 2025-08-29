import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import User from "../models/User";
import { RefreshTokenPayload, clearRefreshToken, generateRefreshToken, signAccessToken, signEmailToken } from "../utils/tokenUtils";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendActivationEmail, sendPasswordResetEmail } from "../services/email";
import { getCaptcha, verifyCaptcha } from "../utils/captcha";
import CaptchaRecord from "../models/CaptchaRecord";
import { config } from "../confg";

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const deviceId = req.headers["x-device-id"] as string;

    if (!deviceId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (typeof email === "undefined" || typeof password === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {

        if (!user.active) {
            res.status(401).json({ message: "Account is deactivated" });
            return
        }

        const { accessToken, data: tokenInfo } = await signAccessToken({
            userId: user._id.toString(),
            roles: user.roles
        }, deviceId);

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

    }
    else {
        res.status(401).json({ message: "Invalid email or password" });
    }

})

const register = asyncHandler(async (req: Request, res: Response) => {
    const { email, name, password, solution, captchaId } = req.body;
    const deviceId = req.headers["x-device-id"] as string;

    if (!deviceId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    if (typeof email === "undefined" || typeof password === "undefined" || typeof solution === "undefined" || typeof captchaId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const record = await CaptchaRecord.findById(captchaId);

    if (record === null || !verifyCaptcha(solution, record.encrypted)) {
        res.status(403).json({ message: "Captcha verification failed" });
        return
    }

    await CaptchaRecord.deleteOne({ _id: captchaId });

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: "Email is already registered" });
        return
    }

    const user = await User.create({
        email,
        name,
        password,
        emailVerified: config.nodeEnv == "development"
    });

    if (user) {

        const { accessToken, data: tokenInfo } = await signAccessToken({
            userId: user._id.toString(),
            roles: user.roles
        }, deviceId);

        const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
            (tokenInfo as JwtPayload).exp! * 1000 : 0;

        await generateRefreshToken(res, { userId: user._id.toString() });

        const { emailToken } = signEmailToken({
            userId: user._id.toString(),
            email: user.email,
            action: "verify-email"
        });

        if (config.nodeEnv === "production") {
            try {
                await sendActivationEmail(user.name, user.email, user._id.toString(), emailToken);

                user.lastVerificationEmailTimestamp = Date.now();
                await user.save();
            }
            catch {
                console.log("Activation email could not be sent");
            }
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
    }
    else {
        res.status(401).json({ message: "Invalid email or password" });
    }

});

const logout = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies;

    if (cookies?.refreshToken) {
        clearRefreshToken(res);
    }
    res.json({});
})

const refresh = asyncHandler(async (req: Request, res: Response) => {
    const deviceId = req.headers["x-device-id"] as string;
    const cookies = req.cookies;

    if (!cookies?.refreshToken || !deviceId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const refreshToken = cookies.refreshToken;

    jwt.verify(
        refreshToken,
        config.refreshTokenSecret,
        async (err: VerifyErrors | null, decoded: any) => {
            if (err) {
                res.status(403).json({ message: "Forbidden" });
                return
            }

            const payload = decoded as RefreshTokenPayload;
            const user = await User.findById(payload.userId).select('roles active tokenVersion');

            if (!user || !user.active || payload.tokenVersion !== user.tokenVersion) {  // NEW: Check version
                res.status(401).json({ message: "Unauthorized" });
                return
            }

            const { accessToken, data: tokenInfo } = await signAccessToken({
                userId: user._id.toString(),
                roles: user.roles
            }, deviceId);

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
    const { email } = req.body;

    if (typeof email === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    const user = await User.findOne({ email }).lean();

    if (user === null) {
        res.status(404).json({ message: "Email is not registered" });
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
    catch {
        res.status(500).json({ message: "Email could not be sent" })
    }

})

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password, resetId } = req.body;

    if (typeof password === "undefined" || typeof token === "undefined" || typeof resetId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    jwt.verify(
        token,
        config.emailTokenSecret,
        async (err: VerifyErrors | null, decoded: any) => {
            if (!err) {
                const userId = decoded.userId as string;

                if (userId !== resetId || decoded.action != "reset-password") {
                    res.json({ success: false });
                    return
                }

                const user = await User.findById(resetId);

                if (user === null) {
                    res.status(404).json({ message: "User not found" })
                    return
                }

                user.password = password;
                user.tokenVersion = (user.tokenVersion || 0) + 1;

                try {
                    await user.save();

                    const cookies = req.cookies;

                    if (cookies?.refreshToken) {
                        clearRefreshToken(res);
                    }

                    res.json({ success: true });
                }
                catch (err) {
                    res.json({ success: false });
                }
            }
            else {
                res.json({ success: false });
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
    const { token, userId } = req.body;

    if (typeof token === "undefined" || typeof userId === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

    jwt.verify(
        token,
        config.emailTokenSecret,
        async (err: VerifyErrors | null, decoded: any) => {
            if (!err) {
                const userId2 = decoded.userId as string;
                const email = decoded.email as string;

                if (userId2 !== userId || decoded.action != "verify-email") {
                    res.json({ success: false });
                    return
                }

                const user = await User.findById(userId);

                if (user === null) {
                    res.status(404).json({ message: "User not found" })
                    return
                }

                if (user.email !== email) {
                    res.json({ success: false });
                    return
                }

                user.emailVerified = true;

                try {
                    await user.save();

                    res.json({ success: true });
                }
                catch (err) {
                    res.json({ success: false });
                }
            }
            else {
                res.json({ success: false });
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