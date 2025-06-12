import { Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../confg";

interface RefreshTokenPayload {
    userId: string;
}

interface AccessTokenPayload {
    userInfo: {
        userId: string;
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
        config.refreshTokenSecret,
        { expiresIn: "7d" }
    );

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

const clearRefreshToken = (res: Response) => {
    res.clearCookie("refreshToken");
}

const signAccessToken = (payload: AccessTokenPayload) => {

    const accessToken = jwt.sign(
        payload,
        config.accessTokenSecret,
        { expiresIn: "30m" }
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