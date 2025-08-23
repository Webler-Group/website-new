import { Response, NextFunction } from "express";
import { IAuthRequest } from "./verifyJWT";
import User from "../models/User";

const protectRoute = (requiredRoles: string[] = []) => {
    return async (req: IAuthRequest, res: Response, next: NextFunction) => {
        if (!req.userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const user = await User.findById(req.userId, "active");
        if (!user || !user.active) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (requiredRoles.length > 0) {
            const hasRole = req.roles!.some((role: string) => requiredRoles.includes(role));
            if (!hasRole) {
                return res.status(403).json({ message: "Insufficient role" });
            }
        }

        next();
    }
}

export default protectRoute;