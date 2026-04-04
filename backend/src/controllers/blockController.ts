import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import { BlockModel } from "../models/Block";
import UserModel, { User, USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { parseWithZod } from "../utils/zodUtils";
import { blockUserSchema } from "../validation/blockSchema";
import { canBlock } from "../helpers/blockHelper";
import HttpError from "../exceptions/HttpError";
import { formatUserMinimal } from "../helpers/userHelper";
import { Types } from "mongoose";

export const blockUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(blockUserSchema, req);
    const { targetId } = body;
    const userId = req.userId!;

    const blocker = await UserModel.findById(userId).lean();
    const target = await UserModel.findById(targetId).lean();

    if (!blocker || !target) {
        throw new HttpError("User not found", 404);
    }

    if (!canBlock(blocker, target)) {
        throw new HttpError("You cannot block this user", 403);
    }

    const exists = await BlockModel.exists({
        blocker: userId,
        blocked: targetId
    });

    if (exists) {
        throw new HttpError("Already blocked", 400);
    }

    await BlockModel.create({
        blocker: blocker._id,
        blocked: target._id
    });

    res.json({ success: true });
});



export const unblockUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(blockUserSchema, req);
    const { targetId } = body;
    const userId = req.userId!;

    const exists = await BlockModel.exists({
        blocker: userId,
        blocked: targetId
    });

    if (!exists) {
        throw new HttpError("Not blocked", 400);
    }

    await BlockModel.deleteOne({
        blocker: userId,
        blocked: targetId
    });

    res.json({ success: true });

});



export const getBlockedUsers = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const userId = req.userId!;

    const blocked = await BlockModel.find({ blocker: userId })
        .populate<{ blocked: UserMinimal & { _id: Types.ObjectId } }>({
            path: "blocked",
            select: USER_MINIMAL_FIELDS
        })
        .lean();

    res.json({
        success: true,
        data: blocked.map(b => formatUserMinimal(b.blocked))
    });

});

const BlockController = {
    getBlockedUsers,
    blockUser,
    unblockUser
}

export default BlockController;