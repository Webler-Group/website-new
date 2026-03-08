import { Response } from "express";
import { IAuthRequest } from "../middleware/verifyJWT";
import UserModel, { USER_ADMIN_FIELDS, UserAdmin } from "../models/User";
import asyncHandler from "express-async-handler";
import mongoose, { Types } from "mongoose";
import { escapeRegex } from "../utils/regexUtils";
import RolesEnum from "../data/RolesEnum";
import {
    getUsersListSchema,
    getUserSchema,
    banUserSchema,
    updateRolesSchema
} from "../validation/adminSchema";
import { parseWithZod } from "../utils/zodUtils";
import { getImageUrl } from "./mediaController";
import PostModel from "../models/Post";
import CodeModel from "../models/Code";
import NotificationModel from "../models/Notification";
import { withTransaction } from "../utils/transaction";
import { formatUserAdmin } from "../helpers/userHelper";

const getUsersList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUsersListSchema, req);
    const { search, count, page, date, role, active } = body;

    const filter: mongoose.QueryFilter<typeof UserModel> = {};

    if (search && search.trim().length > 0) {
        filter.name = new RegExp(escapeRegex(search.trim()), "i");
    }

    if (date) {
        const parsed = new Date(date);
        const start = new Date(parsed);
        start.setHours(0, 0, 0, 0);
        const end = new Date(parsed);
        end.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
    }

    if (role) {
        filter.roles = role;
    }

    if (active !== undefined) {
        filter.active = active;
    }

    const users = await UserModel.find(filter, { ...USER_ADMIN_FIELDS, bio: 0 })
        .sort({ createdAt: -1 })
        .skip((page - 1) * count)
        .limit(count)
        .lean<(UserAdmin & { _id: Types.ObjectId })[]>();

    const total = await UserModel.countDocuments(filter);

    res.json({
        success: true,
        users: users.map(u => formatUserAdmin(u)),
        count: total
    });
});

const getUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUserSchema, req);
    const { userId } = body;

    const user = await UserModel.findById(userId, USER_ADMIN_FIELDS)
        .lean<UserAdmin & { _id: Types.ObjectId }>();;

    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    res.json({
        success: true,
        user: formatUserAdmin(user)
    });
});

const banUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(banUserSchema, req);
    const { userId, active, note } = body;
    const currentUserId = req.userId;

    const result = await withTransaction(async (session) => {
        const user = await UserModel.findById(userId).session(session);
        if (!user) return null;

        if (user.roles.includes(RolesEnum.ADMIN)) return { unauthorized: true } as const;

        const activeChanged = user.active !== active;
        user.active = active;

        if (activeChanged) {
            await PostModel.updateMany({ user: user._id }, { $set: { hidden: !active } }, { session });
            await CodeModel.updateMany({ user: user._id }, { $set: { hidden: !active } }, { session });
            await NotificationModel.updateMany({ actionUser: user._id }, { $set: { hidden: !active } }, { session });
        }

        user.ban = !active
            ? { author: new mongoose.Types.ObjectId(currentUserId!), note, date: new Date() }
            : null;

        await user.save({ session });

        return { active: user.active, ban: user.active ? null : user.ban };
    });

    if (!result) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    if ("unauthorized" in result) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    res.json({ success: true, data: result });
});

const updateRoles = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(updateRolesSchema, req);
    const { userId, roles } = body;

    const user = await UserModel.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    user.roles = roles;
    await user.save();

    res.json({ success: true, data: { roles: user.roles } });
});

const controller = {
    getUsersList,
    banUser,
    getUser,
    updateRoles
};

export default controller;