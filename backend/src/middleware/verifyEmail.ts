import { Response, NextFunction } from "express";
import { IAuthRequest } from "./verifyJWT";
import User from "../models/User";

const verifyEmail = async (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (!(await User.findById(req.userId))?.emailVerified) {
        return res.status(403).json({ message: "Verify your email address" });
    }
    next()
}

export default verifyEmail;