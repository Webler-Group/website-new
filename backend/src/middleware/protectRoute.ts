import { Response, NextFunction } from "express";
import { IAuthRequest } from "./verifyJWT";
import User from "../models/User";

const protectRoute = async (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId || !(await User.findById(req.userId))?.active) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next()
}

export default protectRoute;