import jwt, { VerifyErrors } from "jsonwebtoken";
import User from "../models/User";
import { IRefreshTokenPayload, clearRefreshToken, generateRefreshToken, signAccessToken } from "../utils/tokenUtils";
import { Request, Response } from "express";

const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (typeof email == "undefined" || typeof password === "undefined") {
        return res.status(400).json({ message: "Some fields are missing" });
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {

        if (!user.active) {
            return res.status(401).json({ message: "Account is deactivated" });
        }

        const accessToken = signAccessToken({
            userInfo: {
                userId: user._id.toString(),
                nickname: user.name,
                roles: user.roles
            }
        })

        generateRefreshToken(res, { userId: user._id.toString() });

        res.json({
            accessToken,
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

}

const register = async (req: Request, res: Response) => {
    const { email, name, password } = req.body;

    if (typeof email == "undefined" || typeof password === "undefined") {
        return res.status(400).json({ message: "Some fields are missing" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: "Email is already registered" });
    }

    const user = await User.create({
        email,
        name,
        password
    });

    if (user) {

        const accessToken = signAccessToken({
            userInfo: {
                userId: user._id.toString(),
                nickname: user.name,
                roles: user.roles
            }
        })

        generateRefreshToken(res, { userId: user._id.toString() });

        res.json({
            accessToken,
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

}

const logout = async (req: Request, res: Response) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
        return res.sendStatus(204);
    }
    clearRefreshToken(res);
    res.json({});
}

const refresh = async (req: Request, res: Response) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const refreshToken = cookies.jwt;

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET as string,
        async (err: VerifyErrors | null, decoded: any) => {
            if (err) {
                console.log(err);

                return res.status(403).json({ message: "Forbidden" });
            }

            const user = await User.findById((decoded as IRefreshTokenPayload).userId);

            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const accessToken = signAccessToken({
                userInfo: {
                    userId: user._id.toString(),
                    nickname: user.name,
                    roles: user.roles
                }
            })

            res.json({ accessToken })
        }
    );
}

export default {
    login,
    register,
    logout,
    refresh
};