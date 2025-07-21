import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../confg";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

interface RefreshTokenPayload {
    userId: string;
}

interface AccessTokenPayload {
    userInfo: {
        userId: string;
        roles: string[];
    },
    fingerprint: string;
}

interface EmailTokenPayload {
    userId: string;
    email: string;
}

const generateRefreshToken = (res: Response, payload: RefreshTokenPayload) => {

    const refreshToken = jwt.sign(
        payload,
        config.refreshTokenSecret,
        { expiresIn: "7d" }
    );

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

const clearRefreshToken = (res: Response) => {
    res.clearCookie("refreshToken");
}

const signAccessToken = async (req: Request, userInfo: {
        userId: string;
        roles: string[];
    }) => {
    const deviceId = uuid();
    const fingerprintRaw = deviceId;
    const fingerprint = await bcrypt.hash(fingerprintRaw, 10);

    const payload = {
        userInfo,
        fingerprint
    };

    const accessToken = jwt.sign(
        payload,
        config.accessTokenSecret,
        { expiresIn: "30m" }
    );

    const data = jwt.decode(accessToken);

    return {
        accessToken,
        data,
        deviceId
    };
}

const signEmailToken = (payload: EmailTokenPayload) => {

    const emailToken = jwt.sign(
        payload,
        config.emailTokenSecret,
        { expiresIn: "1h" }
    );

    const data = jwt.decode(emailToken);

    return {
        emailToken,
        data
    };
}

export {
    AccessTokenPayload,
    RefreshTokenPayload,
    generateRefreshToken,
    signAccessToken,
    clearRefreshToken,
    signEmailToken
};