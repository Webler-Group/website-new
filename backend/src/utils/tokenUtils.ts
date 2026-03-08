import { Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../confg";
import bcrypt from "bcrypt";
import User from "../models/User";
import RolesEnum from "../data/RolesEnum";

export interface RefreshTokenPayload {
    userId: string;
    tokenVersion: number;
}

export interface AccessTokenPayload {
    userInfo: {
        userId: string;
        roles: RolesEnum[];
    },
    fingerprint: string;
    tokenVersion: number;
}

export interface EmailTokenPayload {
    userId: string;
    email: string;
    action: string;
}

export const generateRefreshToken = async (res: Response, payload: { userId: string }) => {
    const user = await User.findById(payload.userId, "tokenVersion");
    if (!user) throw new Error("User not found");

    const refreshPayload: RefreshTokenPayload = {
        userId: payload.userId,
        tokenVersion: user.tokenVersion
    };

    const refreshToken = jwt.sign(
        refreshPayload,
        config.refreshTokenSecret,
        { expiresIn: "14d" }
    );

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        maxAge: 14 * 24 * 60 * 60 * 1000
    });
}

export const clearRefreshToken = (res: Response) => {
    res.clearCookie("refreshToken");
}

export const signAccessToken = async (userInfo: { userId: string; roles: RolesEnum[]; }, deviceId: string) => {
    const user = await User.findById(userInfo.userId).select('tokenVersion');
    if (!user) throw new Error('User not found');

    const fingerprintRaw = deviceId;
    const fingerprint = await bcrypt.hash(fingerprintRaw, 10);

    const payload: AccessTokenPayload = {
        userInfo,
        fingerprint,
        tokenVersion: user.tokenVersion
    };

    const accessToken = jwt.sign(
        payload,
        config.accessTokenSecret,
        { expiresIn: "15m" }
    );

    const data = jwt.decode(accessToken);

    return {
        accessToken,
        data
    };
}

export const signEmailToken = (payload: EmailTokenPayload) => {

    const emailToken = jwt.sign(
        payload,
        config.emailTokenSecret,
        { expiresIn: "15m" }
    );

    const data = jwt.decode(emailToken);

    return {
        emailToken,
        data
    };
}