import jwt, { JwtPayload } from "jsonwebtoken";
import UserModel from "../models/User";
import { EmailTokenPayload, RefreshTokenPayload, clearRefreshToken, generateRefreshToken, signAccessToken, signEmailToken } from "../utils/tokenUtils";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendActivationEmail, sendPasswordResetEmail } from "../services/email";
import { getCaptcha, verifyCaptcha } from "../utils/captcha";
import CaptchaRecordModel from "../models/CaptchaRecord";
import { config } from "../confg";
import { parseWithZod } from "../utils/zodUtils";
import { loginSchema, refreshSchema, registerSchema, resetPasswordSchema, sendPasswordResetCodeSchema, verifyEmailSchema } from "../validation/authSchema";
import UserFollowingModel from "../models/UserFollowing";
import { formatAuthUser, getRequestIp, updateUserIp } from "../helpers/userHelper";
import HttpError from "../exceptions/HttpError";
import IpModel from "../models/Ip";
import { emitBadgeEvent } from "../helpers/badgeHelper";
import { withTransaction } from "../utils/transaction";

const login = asyncHandler(async (req, res) => {
    const {
        body,
        headers
    } = parseWithZod(loginSchema, req);
    const { email, password } = body;

    const ip = getRequestIp(req);
    if (ip) {
        const ipDoc = await IpModel.findOne({ value: ip }).lean();
        if (ipDoc?.banned) {
            throw new HttpError("Access denied", 403);
        }
    }

    const user = await UserModel.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
        throw new HttpError("Invalid email or password", 401);
    }

    if (!user.active) {
        throw new HttpError("Account is deactivated", 403);
    }

    user.lastLoginAt = new Date();
    await emitBadgeEvent(user, "email_verified");
    await user.save();

    if (ip) {
        await updateUserIp(user._id, ip);
    }

    const { accessToken, data: tokenInfo } = await signAccessToken({
        userId: user._id.toString(),
        roles: user.roles
    }, headers["x-device-id"]);

    const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
        (tokenInfo as JwtPayload).exp! * 1000 : 0;

    await generateRefreshToken(res, { userId: user._id.toString() });

    res.json({
        success: true,
        data: {
            accessToken,
            expiresIn,
            user: formatAuthUser(user)
        }
    });

});

const register = asyncHandler(async (req: Request, res: Response) => {
    const { body, headers } = parseWithZod(registerSchema, req);
    const { email, name, password, solution, captchaId } = body;

    const ip = getRequestIp(req);
    if (ip) {
        const ipDoc = await IpModel.findOne({ value: ip }).lean();
        if (ipDoc?.banned) {
            throw new HttpError("Access denied", 403);
        }
    }

    const record = await CaptchaRecordModel.findById(captchaId).lean();

    if (record === null || !verifyCaptcha(solution, record.encrypted)) {
        throw new HttpError("Captcha verification failed", 400);
    }

    await CaptchaRecordModel.deleteOne({ _id: captchaId });

    const emailExists = await UserModel.exists({ email });
    const usernameExists = await UserModel.exists({ name });
    if (emailExists) {
        throw new HttpError("Email is already registered", 400);
    } else if (usernameExists) {
        throw new HttpError("Username is already used", 400);
    }

    const user = await UserModel.create({
        email,
        name,
        password,
        emailVerified: config.nodeEnv == "development",
        lastLoginAt: new Date()
    });

    const weblercodesUser = await UserModel.exists({ email: config.adminEmail });
    if (weblercodesUser) {
        await UserFollowingModel.create([{ user: user._id, following: weblercodesUser._id }]);
    }

    if (ip) {
        await updateUserIp(user._id, ip);
    }

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
        catch (err) {
            console.log("Activation email error:", err);
        }
    } else {
        // DEVELOPMENT: EMAIL IS ALWAYS VERIFIED
        await emitBadgeEvent(user, "email_verified");
        await user.save();
    }

    res.json({
        success: true,
        data: {
            accessToken,
            expiresIn,
            user: formatAuthUser(user)
        }
    });
});

const logout = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies;

    if (cookies?.refreshToken) {
        clearRefreshToken(res);
    }
    res.json({ success: true });
});

const refresh = asyncHandler(async (req: Request, res: Response) => {
    const { headers, cookies } = parseWithZod(refreshSchema, req);
    let decoded: RefreshTokenPayload;
    try {
        decoded = jwt.verify(cookies.refreshToken, config.refreshTokenSecret) as RefreshTokenPayload;
    } catch {
        throw new HttpError("Please Login First", 401);
    }

    const user = await UserModel.findById(decoded.userId, { roles: 1, active: 1, tokenVersion: 1 });

    if (!user || !user.active || decoded.tokenVersion !== user.tokenVersion) {
        throw new HttpError("Unauthorized", 401);
    }

    const { accessToken, data: tokenInfo } = await signAccessToken({
        userId: user._id.toString(),
        roles: user.roles
    }, headers["x-device-id"]);

    const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
        (tokenInfo as JwtPayload).exp! * 1000 : 0;

    res.json({
        success: true,
        data: {
            accessToken,
            expiresIn
        }
    });
});

const sendPasswordResetCode = asyncHandler(async (req: Request, res: Response) => {
    const { body } = parseWithZod(sendPasswordResetCodeSchema, req);
    const { email } = body;

    const user = await UserModel.findOne({ email }).lean();

    if (user === null) {
        throw new HttpError("Email is not registered", 404);
    }

    const { emailToken } = signEmailToken({
        userId: user._id.toString(),
        email: user.email,
        action: "reset-password"
    })

    try {
        await sendPasswordResetEmail(user.name, user.email, user._id.toString(), emailToken);

        res.json({ success: true });
    }
    catch (err) {
        console.log("Reset email error:", err);
        throw new HttpError("Email could not be sent", 500);
    }

});

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { body } = parseWithZod(resetPasswordSchema, req);
    const { token, password, resetId } = body;
    let decoded: EmailTokenPayload;
    try {
        decoded = jwt.verify(token, config.emailTokenSecret) as EmailTokenPayload;
    } catch {
        throw new HttpError("Invalid token", 401);
    }

    const userId = decoded.userId;

    if (userId !== resetId || decoded.action != "reset-password") {
        throw new HttpError("Unauthorized", 401);
    }

    const user = await UserModel.findById(resetId);

    if (user === null) {
        throw new HttpError("User not found", 404);
    }

    user.password = password;
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    const cookies = req.cookies;

    if (cookies?.refreshToken) {
        clearRefreshToken(res);
    }

    res.json({ success: true });
});

const generateCaptcha = asyncHandler(async (req: Request, res: Response) => {
    const { base64ImageDataURI, encrypted } = await getCaptcha();

    const record = await CaptchaRecordModel.create({ encrypted });

    const date = new Date(Date.now() - 15 * 60 * 1000);
    await CaptchaRecordModel.deleteMany({ createdAt: { $lt: date } });

    res.json({
        success: true,
        data: {
            captchaId: record._id,
            imageData: base64ImageDataURI
        }
    });
});

const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { body } = parseWithZod(verifyEmailSchema, req);
    const { token, userId } = body;
    let decoded: EmailTokenPayload;
    try {
        decoded = jwt.verify(token, config.emailTokenSecret) as EmailTokenPayload;
    } catch {
        throw new HttpError("Invalid token", 401);
    }

    const userId2 = decoded.userId;
    const email = decoded.email;

    if (userId2 !== userId || decoded.action != "verify-email") {
        throw new HttpError("Unauthorized", 401);
    }

    const user = await UserModel.findById(userId);

    if (user === null) {
        throw new HttpError("User not found", 404);
    }

    if (user.email !== email) {
        throw new HttpError("Unauthorized", 401);
    }

    user.emailVerified = true;

    await user.save();

    res.json({ success: true });
});

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
