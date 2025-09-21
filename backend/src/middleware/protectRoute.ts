import { Response, NextFunction } from "express";
import { IAuthRequest } from "./verifyJWT";

const protectRoute = async (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
        return res.status(403).json({ error: [{ message: "Please Login First" }] });
    }

    next();
}

export default protectRoute;