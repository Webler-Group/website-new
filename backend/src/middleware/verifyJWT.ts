import jwt, { VerifyErrors } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "../confg";
import bcrypt from "bcrypt";
import { AccessTokenPayload } from "../utils/tokenUtils";

interface IAuthRequest extends Request {
    userId?: string;
    roles?: string[];
}

const verifyJWT = (req: IAuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const deviceId = req.headers["x-device-id"];

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
                        const userInfo = accessTokenPayload.userInfo;

                        req.userId = userInfo.userId;
                        req.roles = userInfo.roles;
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