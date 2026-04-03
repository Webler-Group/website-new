import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import { BlockModel } from "../models/Block";
import UserModel, { User } from "../models/User";
import RolesEnum from "../data/RolesEnum";
import { parseWithZod } from "../utils/zodUtils";
import { blockUserSchema } from "../validation/blockSchema";


const canBlock = (blocker: any, target: any) => {
    if (blocker._id.toString() === target._id.toString()) 
        return false;

    if (target.roles.includes(RolesEnum.ADMIN)) 
        return false;

    if (target.roles.includes(RolesEnum.MODERATOR) && !blocker.roles.includes(RolesEnum.ADMIN) ) {
        return false;
    }


    return true;
};


export const blockUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(blockUserSchema, req);
    const { targetId } = body;
    const userId = req.userId!;

    const blocker = await UserModel.findById(userId).lean() as User;
    const target = await UserModel.findById(targetId).lean() as User;

    if (!blocker || !target) {
        res.status(404).json({ message: "User not found" });
    }

    if (!canBlock(blocker, target)) {
        res.status(403).json({ message: "You cannot block this user" });
    }

    const exists = await BlockModel.findOne({
        blocker: userId,
        blocked: targetId
    });

    if (exists) {
        res.status(400).json({ message: "Already blocked" });
    }

    await BlockModel.create({
        blocker: blocker,
        blocked: target
    });

    res.json({ success: true, data: "User blocked" });
});



export const unblockUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(blockUserSchema, req);
    const { targetId } = body;
    const userId = req.userId!;


    await BlockModel.deleteOne({
        blocker: userId,
        blocked: targetId
    });

    res.json({ success: true, data: "User unblocked" });

});



export const getBlockedUsers = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = req.userId!;

    const blocked = await BlockModel.find({ blocker: userId })
        .select("blocked -_id")
        .populate({
            path: "blocked",
            select: "name _id"
        })
        .lean();

    res.json({
        success: true,
        data: blocked
    });

});


const BlockController  = {
    getBlockedUsers,
    blockUser,
    unblockUser
}


export default BlockController;