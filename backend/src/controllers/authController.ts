import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import User from "../models/User";
import { RefreshTokenPayload, clearRefreshToken, generateRefreshToken, signAccessToken, signEmailToken } from "../utils/tokenUtils";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendPasswordResetEmail } from "../services/email";
import { getCaptcha, verifyCaptcha } from "../utils/captcha";
import CaptchaRecord from "../models/CaptchaRecord";

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

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

        const { accessToken, data: tokenInfo } = signAccessToken({
            userInfo: {
                userId: user._id.toString(),
                roles: user.roles
            }
        })

        const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
            (tokenInfo as JwtPayload).exp! * 1000 : 0;

        generateRefreshToken(res, { userId: user._id.toString() });

        res.json({
            accessToken,
            expiresIn,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
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
    });

    if (user) {

        const { accessToken, data: tokenInfo } = signAccessToken({
            userInfo: {
                userId: user._id.toString(),
                roles: user.roles
            }
        })

        const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
            (tokenInfo as JwtPayload).exp! * 1000 : 0;

        generateRefreshToken(res, { userId: user._id.toString() });

        res.json({
            accessToken,
            expiresIn,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
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

});

const logout = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies;

    if (!cookies?.refreshToken) {
        res.status(204).json({});
        return
    }
    clearRefreshToken(res);
    res.json({});
})

const refresh = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies;

    if (!cookies?.refreshToken) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    const refreshToken = cookies.refreshToken;

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET as string,
        async (err: VerifyErrors | null, decoded: any) => {
            if (err) {
                res.status(403).json({ message: "Forbidden" });
                return
            }

            const user = await User.findById((decoded as RefreshTokenPayload).userId);

            if (!user) {
                res.status(401).json({ message: "Unauthorized" });
                return
            }

            const { accessToken, data: tokenInfo } = signAccessToken({
                userInfo: {
                    userId: user._id.toString(),
                    roles: user.roles
                }
            })

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

    const user = await User.findOne({ email });

    if (user === null) {
        res.status(404).json({ message: "Email is not registered" });
        return
    }

    const { emailToken } = signEmailToken({
        userId: user._id.toString(),
        email: user.email
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
        process.env.EMAIL_TOKEN_SECRET as string,
        async (err: VerifyErrors | null, decoded: any) => {
            if (!err) {
                const userId = decoded.userId as string;

                if (userId !== resetId) {
                    res.json({ success: false });
                    return
                }

                const user = await User.findById(resetId);

                if (user === null) {
                    res.status(404).json({ message: "User not found" })
                    return
                }

                user.password = password;

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

const controller = {
    login,
    register,
    logout,
    refresh,
    sendPasswordResetCode,
    resetPassword,
    generateCaptcha
};

export default controller;