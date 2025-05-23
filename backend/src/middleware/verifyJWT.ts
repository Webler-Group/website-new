import jwt, { VerifyErrors } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { AccessTokenPayload } from "../utils/tokenUtils";
import { config } from "../confg";

interface IAuthRequest extends Request {
    userId?: string;
    roles?: string[];
}

const verifyJWT = (req: IAuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {

        const token = authHeader.split(" ")[1];

        jwt.verify(
            token,
            config.accessTokenSecret,
            (err: VerifyErrors | null, decoded: any) => {
                if (!err) {
                    const userInfo = (decoded as AccessTokenPayload).userInfo;

                    req.userId = userInfo.userId;
                    req.roles = userInfo.roles;
                }
            }
        )

    }

    next()
}

export {
    IAuthRequest
}

export default verifyJWT;