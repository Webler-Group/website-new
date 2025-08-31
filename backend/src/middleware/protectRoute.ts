import { Response, NextFunction } from "express";
import { IAuthRequest } from "./verifyJWT";

const protectRoute = async (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
        return res.status(403).json({ message: "Forbidden" });
    }

    next();
}

export default protectRoute;