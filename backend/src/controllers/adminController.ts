import { Response } from "express";
import { IAuthRequest } from "../middleware/verifyJWT";
import User from "../models/User";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { escapeRegex } from "../utils/regexUtils";
import RolesEnum from "../data/RolesEnum";
import {
    getUsersListSchema,
    getUserSchema,
    banUserSchema,
    updateRolesSchema
} from "../validation/adminSchema";
import { parseWithZod } from "../utils/zodUtils";

const getUsersList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUsersListSchema, req);
    const { search, count, page, date, role, active } = body;

    const filter: any = {};

    if (search && search.trim().length > 0) {
        const safeQuery = escapeRegex(search.trim());
        filter.name = new RegExp(safeQuery, "i");
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

    const users = await User.find(filter)
        .select("_id email countryCode name avatarImage roles createdAt level emailVerified active ban")
        .sort({ createdAt: -1 })
        .skip((page - 1) * count)
        .limit(count);

    const total = await User.countDocuments(filter);

    res.json({
        success: true,
        users: users.map(u => ({
            id: u._id,
            email: u.email,
            countryCode: u.countryCode,
            name: u.name,
            avatarImage: u.avatarImage,
            roles: u.roles,
            registerDate: u.createdAt,
            level: u.level,
            verified: u.emailVerified,
            active: u.active,
            ban: u.ban
                ? {
                    author: u.ban.author,
                    note: u.ban.note,
                    date: u.ban.date
                }
                : null
        })),
        count: total
    });
});

const getUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUserSchema, req);
    const { userId } = body;

    const user = await User.findById(userId)
        .select("_id email countryCode name avatarImage roles createdAt level emailVerified active ban bio");

    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    res.json({
        success: true,
        user: {
            id: user._id,
            email: user.email,
            countryCode: user.countryCode,
            name: user.name,
            avatarImage: user.avatarImage,
            roles: user.roles,
            registerDate: user.createdAt,
            level: user.level,
            verified: user.emailVerified,
            active: user.active,
            bio: user.bio,
            ban: (!user.active && user.ban)
                ? {
                    author: user.ban.author,
                    note: user.ban.note,
                    date: user.ban.date
                }
                : null
        }
    });
});

const banUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(banUserSchema, req);
    const { userId, active, note } = body;
    const currentUserId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    if (user.roles.includes(RolesEnum.ADMIN)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }

    user.active = active;

    if (!user.active) {
        user.ban = {
            author: new mongoose.Types.ObjectId(currentUserId!),
            note,
            date: new Date()
        };
    } else {
        user.ban = null as any;
    }

    await user.save();
    res.json({
        success: true,
        data: {
            active: user.active,
            ban: user.active ? null : user.ban
        }
    });
});

const updateRoles = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(updateRolesSchema, req);
    const { userId, roles } = body;

    const user = await User.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }

    user.roles = roles;
    await user.save();
    res.json({
        success: true,
        data: { roles: user.roles }
    });
});

const controller = {
    getUsersList,
    banUser,
    getUser,
    updateRoles
};

export default controller;
