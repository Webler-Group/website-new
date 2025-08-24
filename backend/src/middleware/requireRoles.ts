import { Response, NextFunction } from "express";
import { IAuthRequest } from "./verifyJWT";

const requireRoles = (requiredRoles: string[] = []) => {
    return async (req: IAuthRequest, res: Response, next: NextFunction) => {
        if (requiredRoles.length > 0) {
            const hasRole = req.roles && req.roles.some((role: string) => requiredRoles.includes(role));
            if (!hasRole) {
                return res.status(403).json({ message: "Insufficient role" });
            }
        }

        next();
    }
}

export default requireRoles;