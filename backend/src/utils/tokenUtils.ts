import { Response } from "express";
import jwt from "jsonwebtoken";

interface RefreshTokenPayload {
    userId: string;
}

interface AccessTokenPayload {
    userInfo: {
        userId: string;
        emailVerified: boolean;
        roles: string[];
    }
}

interface EmailTokenPayload {
    userId: string;
    email: string;
}

const generateRefreshToken = (res: Response, payload: RefreshTokenPayload) => {

    const refreshToken = jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET as string,
        { expiresIn: "7d" }
    );

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

const clearRefreshToken = (res: Response) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });
}

const signAccessToken = (payload: AccessTokenPayload) => {

    const accessToken = jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET as string,
        { expiresIn: "15m" }
    );

    const data = jwt.decode(accessToken);

    return {
        accessToken,
        data
    };
}

const signEmailToken = (payload: EmailTokenPayload) => {

    const emailToken = jwt.sign(
        payload,
        process.env.EMAIL_TOKEN_SECRET as string,
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