import jwt, { VerifyErrors } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "../confg";
import bcrypt from "bcrypt";
import { AccessTokenPayload } from "../utils/tokenUtils";
import User from "../models/User";

interface IAuthRequest extends Request {
    userId?: string;
    roles?: string[];
    deviceId?: string;
}

const verifyJWT = (req: IAuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const deviceId = req.headers["x-device-id"] as string;

    req.deviceId = deviceId;

    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ") && typeof deviceId === "string") {

        const token = authHeader.split(" ")[1];

        jwt.verify(
            token,
            config.accessTokenSecret,
            async (err: VerifyErrors | null, decoded: any) => {
                const accessTokenPayload = decoded as AccessTokenPayload;
                if (!err) {
                    const rawFingerprint = deviceId;
                    const match = await bcrypt.compare(rawFingerprint, accessTokenPayload.fingerprint);

                    if (match) {
                        // NEW: Fetch user and check tokenVersion
                        const user = await User.findById(accessTokenPayload.userInfo.userId).select('tokenVersion active');
                        if (user && user.active && accessTokenPayload.tokenVersion === user.tokenVersion) {
                            const userInfo = accessTokenPayload.userInfo;
                            req.userId = userInfo.userId;
                            req.roles = userInfo.roles;
                        }
                    }
                }
                next();
            }
        )

    } else {
        next();
    }
}

export {
    IAuthRequest
}

export default verifyJWT;