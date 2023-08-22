import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import User from "../models/User";
import { RefreshTokenPayload, clearRefreshToken, generateRefreshToken, signAccessToken } from "../utils/tokenUtils";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (typeof email == "undefined" || typeof password === "undefined") {
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
    const { email, name, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
        res.status(400).json({ message: "Some fields are missing" });
        return
    }

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

const controller = {
    login,
    register,
    logout,
    refresh
};

export default controller;