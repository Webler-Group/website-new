import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import { BlockModel } from "../models/Block";
import UserModel, { User, USER_MINIMAL_FIELDS, UserMinimal } from "../models/User";
import { parseWithZod } from "../utils/zodUtils";
import { blockUserSchema } from "../validation/blockSchema";
import { canBlock, MAX_BLOCK_COUNT } from "../helpers/blockHelper";
import HttpError from "../exceptions/HttpError";
import { deleteFollowAndCleanup, formatUserMinimal } from "../helpers/userHelper";
import { Types } from "mongoose";
import { withTransaction } from "../utils/transaction";

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

    const [exists, blockCount] = await Promise.all([
        BlockModel.exists({ blocker: userId, blocked: targetId }),
        BlockModel.countDocuments({ blocker: userId })
    ]);

    if (exists) {
        throw new HttpError("Already blocked", 400);
    }

    if (blockCount >= MAX_BLOCK_COUNT) {
        throw new HttpError(`Block list limit reached (max ${MAX_BLOCK_COUNT})`, 400);
    }

    await withTransaction(async (session) => {
        await BlockModel.create([{
            blocker: blocker._id,
            blocked: target._id
        }], { session });

        await deleteFollowAndCleanup(blocker._id, target._id, session);
        await deleteFollowAndCleanup(target._id, blocker._id, session);
    });

    res.json({ success: true });
});



export const unblockUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(blockUserSchema, req);
    const { targetId } = body;
    const userId = req.userId!;

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
        data: {
            users: blocked.map(b => formatUserMinimal(b.blocked))
        }
    });

});

const BlockController = {
    getBlockedUsers,
    blockUser,
    unblockUser
}

export default BlockController;