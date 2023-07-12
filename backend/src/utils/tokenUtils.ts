import { Response } from "express";
import jwt from "jsonwebtoken";

interface IRefreshTokenPayload {
    userId: string;
}

const generateRefreshToken = (res: Response, payload: IRefreshTokenPayload) => {

    const refreshToken = jwt.sign(
        payload,
        process.env.REFRESH_TOKEN_SECRET as string,
        { expiresIn: "7d" }
    );

    res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

interface IAccessTokenPayload {
    userInfo: { 
        userId: string;
        nickname: string;
        roles: string[]; 
    }
}

const signAccessToken = (payload: IAccessTokenPayload) => {

    const accessToken = jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET as string,
        { expiresIn: "15m" }
    );
    return accessToken;
}

export {
    IAccessTokenPayload,
    IRefreshTokenPayload,
    generateRefreshToken,
    signAccessToken
};