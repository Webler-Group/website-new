import jwt, { VerifyErrors } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { IAccessTokenPayload } from "../utils/tokenUtils";

interface IAuthRequest extends Request {
    userId?: string;
    roles?: string[];
}

const verifyJWT = (req: IAuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if(!(typeof authHeader === "string" && authHeader.startsWith("Bearer "))) {
        
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string,
        (err: VerifyErrors | null, decoded: any) => {
            if(err) {
                return res.status(403).json({ message: "Forbidden" });
            }

            const userInfo = (decoded as IAccessTokenPayload).userInfo;

            req.userId = userInfo.userId;
            req.roles = userInfo.roles;

            next();
        }
    )
}

export {
    IAuthRequest
}

export default verifyJWT;