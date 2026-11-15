import jwt, { JwtPayload } from "jsonwebtoken";
import UserModel from "../models/User";
import { EmailTokenPayload, RefreshTokenPayload, clearRefreshToken, generateRefreshToken, signAccessToken, signEmailToken } from "../utils/tokenUtils";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendActivationEmail, sendLoginVerificationEmail, sendPasswordResetEmail } from "../services/email";
import { getCaptcha, verifyCaptcha } from "../utils/captcha";
import CaptchaRecordModel from "../models/CaptchaRecord";
import { config } from "../confg";
import { parseWithZod } from "../utils/zodUtils";
import { loginSchema, refreshSchema, registerSchema, resetPasswordSchema, sendPasswordResetCodeSchema, verifyEmailSchema, verifyLoginSchema } from "../validation/authSchema";
import UserFollowingModel from "../models/UserFollowing";
import { addTrustedDevice, formatAuthUser, generateVerificationCode, getRequestIp, hashDeviceId, hashVerificationCode, touchTrustedDevice, updateUserIp } from "../helpers/userHelper";
import HttpError from "../exceptions/HttpError";
import IpModel from "../models/Ip";
import LoginVerificationRecordModel, { LOGIN_VERIFICATION_MAX_ATTEMPTS, LOGIN_VERIFICATION_TTL_MS } from "../models/LoginVerificationRecord";
import { DocumentType } from "@typegoose/typegoose";
import { User } from "../models/User";
import crypto from "crypto";

// Minimum delay before a new verification code is emailed for the same user and device
const LOGIN_VERIFICATION_RESEND_MS = 60 * 1000;

const assertIpNotBanned = async (ip: string | undefined) => {
    if (!ip) return;
    const ipDoc = await IpModel.findOne({ value: ip }).lean();
    if (ipDoc?.banned) {
        throw new HttpError("Access denied", 403);
    }
};

/**
 * Marks the user as logged in from the given ip and responds with access + refresh tokens.
 * Saves the user document (including any trusted device changes made by the caller).
 */
const completeLogin = async (res: Response, user: DocumentType<User>, deviceId: string, ip: string | undefined) => {
    user.lastLoginAt = new Date();
    await user.save();

    if (ip) {
        await updateUserIp(user._id, ip);
    }

    const { accessToken, data: tokenInfo } = await signAccessToken({
        userId: user._id.toString(),
        roles: user.roles
    }, deviceId);

    const expiresIn = typeof (tokenInfo as JwtPayload).exp == "number" ?
        (tokenInfo as JwtPayload).exp! * 1000 : 0;

    await generateRefreshToken(res, { userId: user._id.toString() });

    res.json({
        success: true,
        data: {
            verificationRequired: false,
            accessToken,
            expiresIn,
            user: formatAuthUser(user)
        }
    });
};

const login = asyncHandler(async (req, res) => {
    const {
        body,
        headers
    } = parseWithZod(loginSchema, req);
    const { email, password } = body;
    const deviceId = headers["x-device-id"];

    const ip = getRequestIp(req);
    await assertIpNotBanned(ip);

    const user = await UserModel.findOne({ email }).select("+trustedDevices");

    if (!user || !(await user.matchPassword(password))) {
        throw new HttpError("Invalid email or password", 401);
    }

    if (!user.active) {
        throw new HttpError("Account is deactivated", 403);
    }

    const deviceHash = hashDeviceId(deviceId);

    if (touchTrustedDevice(user, deviceHash)) {
        await completeLogin(res, user, deviceId, ip);
        return;
    }

    // Unknown device -> require verification code sent to the user's email
    const existing = await LoginVerificationRecordModel.findOne({ userId: user._id, deviceHash });
    const now = Date.now();
    if (
        existing &&
        now - existing.createdAt.getTime() < LOGIN_VERIFICATION_RESEND_MS &&
        existing.attempts < LOGIN_VERIFICATION_MAX_ATTEMPTS
    ) {
        // A code was sent moments ago, don't spam the mailbox
        res.json({
            success: true,
            data: {
                verificationRequired: true,
                verificationId: existing._id.toString(),
                expiresAt: existing.createdAt.getTime() + LOGIN_VERIFICATION_TTL_MS
            }
        });
        return;
    }

    const code = generateVerificationCode();

    await LoginVerificationRecordModel.deleteMany({ userId: user._id, deviceHash });
    const record = await LoginVerificationRecordModel.create({
        userId: user._id,
        deviceHash,
        codeHash: hashVerificationCode(code)
    });

    if (config.nodeEnv === "development") {
        console.log(`Login verification code for ${user.email}: ${code}`);
    } else {
        try {
            await sendLoginVerificationEmail(user.name, user.email, code, ip);
        } catch (err) {
            await LoginVerificationRecordModel.deleteOne({ _id: record._id });
            console.log("Login verification email error:", err);
            throw new HttpError("Failed to send verification email. Please try again later.", 502);
        }
    }

    res.json({
        success: true,
        data: {
            verificationRequired: true,
            verificationId: record._id.toString(),
            expiresAt: record.createdAt.getTime() + LOGIN_VERIFICATION_TTL_MS
        }
    });
});

const verifyLogin = asyncHandler(async (req: Request, res: Response) => {
    const { body, headers } = parseWithZod(verifyLoginSchema, req);
    const { verificationId, code } = body;
    const deviceId = headers["x-device-id"];
    const deviceHash = hashDeviceId(deviceId);

    const ip = getRequestIp(req);
    await assertIpNotBanned(ip);

    // Count the attempt atomically before checking the code, so parallel guesses can't exceed the limit
    const record = await LoginVerificationRecordModel.findOneAndUpdate(
        { _id: verificationId, deviceHash, attempts: { $lt: LOGIN_VERIFICATION_MAX_ATTEMPTS } },
        { $inc: { attempts: 1 } },
        { returnDocument: "after" }
    ).lean();

    if (!record) {
        throw new HttpError("Invalid or expired code, please sign in again", 400);
    }

    if (Date.now() - record.createdAt.getTime() > LOGIN_VERIFICATION_TTL_MS) {
        await LoginVerificationRecordModel.deleteOne({ _id: record._id });
        throw new HttpError("Code has expired, please sign in again", 403);
    }

    const codeMatches = crypto.timingSafeEqual(
        Buffer.from(hashVerificationCode(code), "hex"),
        Buffer.from(record.codeHash, "hex")
    );
    if (!codeMatches) {
        const attemptsLeft = LOGIN_VERIFICATION_MAX_ATTEMPTS - record.attempts;
        if (attemptsLeft <= 0) {
            await LoginVerificationRecordModel.deleteOne({ _id: record._id });
            throw new HttpError("Too many invalid attempts, please sign in again", 403);
        }
        throw new HttpError(`Invalid code, ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`, 400);
    }

    await LoginVerificationRecordModel.deleteOne({ _id: record._id });

    const user = await UserModel.findById(record.userId).select("+trustedDevices");
    if (!user) {
        throw new HttpError("User not found", 404);
    }
    if (!user.active) {
        throw new HttpError("Account is deactivated", 403);
    }

    addTrustedDevice(user, deviceHash);
    await completeLogin(res, user, deviceId, ip);
});

const register = asyncHandler(async (req: Request, res: Response) => {
    const { body, headers } = parseWithZod(registerSchema, req);
    const { email, name, password, solution, captchaId } = body;

    const ip = getRequestIp(req);
    await assertIpNotBanned(ip);

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
        lastLoginAt: new Date(),
        trustedDevices: [{ hash: hashDeviceId(headers["x-device-id"]), lastUsedAt: new Date() }]
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

    const user = await UserModel.findById(decoded.userId, { roles: 1, active: 1, tokenVersion: 1, trustedDevices: 1 });

    if (!user || !user.active || decoded.tokenVersion !== user.tokenVersion) {
        throw new HttpError("Unauthorized", 401);
    }

    // Migration for sessions created before device verification existed:
    // a user with a valid session but no trusted devices gets the current device trusted,
    // so they aren't asked for an email code on their next sign-in from this browser.
    if (!user.trustedDevices || user.trustedDevices.length === 0) {
        addTrustedDevice(user, hashDeviceId(headers["x-device-id"]));
        await user.save();
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
    // Whoever reset the password must verify every device again, including ones an attacker may have added
    user.trustedDevices = [];
    user.markModified("trustedDevices");

    await user.save();
    await LoginVerificationRecordModel.deleteMany({ userId: user._id });

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
    verifyLogin,
    register,
    logout,
    refresh,
    sendPasswordResetCode,
    resetPassword,
    generateCaptcha,
    verifyEmail
};

export default controller;
