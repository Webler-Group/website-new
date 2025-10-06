import RolesEnum from "../data/RolesEnum";
import { IAuthRequest } from "../middleware/verifyJWT";


export const isAuthorizedRole = (req: IAuthRequest, expectedRoles: RolesEnum[]) => 
    req.roles && req.roles.some(i => expectedRoles.includes(i));