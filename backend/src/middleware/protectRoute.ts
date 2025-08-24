import { Response, NextFunction } from "express";
import { IAuthRequest } from "./verifyJWT";
import User from "../models/User";

const protectRoute = async (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
        return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.userId, "active");
    if (!user || !user.active) {
        return res.status(403).json({ message: "Forbidden" });
    }


    next();
}

export default protectRoute;