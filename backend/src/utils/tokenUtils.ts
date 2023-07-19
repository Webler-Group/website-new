import { Response } from "express";
import jwt from "jsonwebtoken";

interface RefreshTokenPayload {
    userId: string;
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

interface AccessTokenPayload {
    userInfo: {
        userId: string;
        roles: string[];
    }
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
        { expiresIn: "1m" }
    );
    return accessToken;
}

export {
    AccessTokenPayload,
    RefreshTokenPayload,
    generateRefreshToken,
    signAccessToken,
    clearRefreshToken
};