import { Response, NextFunction } from "express";
import { IAuthRequest } from "./verifyJWT";
import { isBlocked } from "../utils/blockUtils";


/**
 * This function forces login if response is bad. 
 * It feels illegal to access blocked profile anyway so the function is just fine. 
 * 
 * The modus operandi now is that once login is forced, the parameter return is "next" which
 * points to the target profile. The user must refresh the page to be able to login again.
 * 
 * An explanation to this is the fact that the "Blocking" system is Bi-directional.
 * 
 * @param getTargetId callback function to get the target id
 * @returns 
 */
const checkBlocked = (getTargetId: (req: IAuthRequest) => string | undefined) => {
  return async (req: IAuthRequest, res: Response, next: NextFunction) => {
    const userId = req.userId as string;
    const targetId = getTargetId(req);

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: "Target user not specified"
      });
    }

    if (await isBlocked(userId, targetId)) {
      return res.status(403).json({
        success: false,
        message: "Action not allowed (user blocked)"
      });
    }

    next();
  };
};


export default checkBlocked;