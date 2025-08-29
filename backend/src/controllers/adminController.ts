import { Response } from "express";
import { IAuthRequest } from "../middleware/verifyJWT";
import User from "../models/User";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { escapeRegex } from "../utils/regexUtils";

const getUsersList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { search, count, page, date, role, active } = req.body as {
        search?: string;
        count?: number;
        page?: number;
        date?: string;
        role?: string;
        active?: boolean; // optional active filter
    };

    // validate body (ignore search if undefined)
    if (
        typeof count !== "number" ||
        typeof page !== "number" ||
        count <= 0 || count > 100 ||
        page <= 0 ||
        (date && typeof date !== "string") ||
        (role && typeof role !== "string") ||
        (active !== undefined && typeof active !== "boolean")
    ) {
        res.status(400).json({ message: "Invalid body" });
        return;
    }

    const filter: any = {};

    // name filter (only if search is non-empty)
    if (search && search.trim().length > 0) {
        const safeQuery = escapeRegex(search.trim());
        filter.name = new RegExp(safeQuery, "i");
    }

    // date filter
    if (date) {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            const start = new Date(parsed);
            start.setHours(0, 0, 0, 0);
            const end = new Date(parsed);
            end.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: start, $lte: end };
        }
    }

    // role filter
    if (role) {
        filter.roles = role;
    }

    // active filter
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
    const { userId } = req.body as { userId?: string };

    if (!userId || typeof userId !== "string") {
        res.status(400).json({ message: "Invalid body" });
        return;
    }

    const user = await User.findById(userId)
        .select("_id email countryCode name avatarImage roles createdAt level emailVerified active ban bio");

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    res.json({
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
    const { userId, active, note } = req.body;
    const currentUserId = req.userId;

    const user = await User.findById(userId);

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return
    }

    if (user.roles.includes("Admin")) {
        res.status(404).json({ message: "Unauthorized" });
        return
    }

    user.active = active;

    if (!user.active) {
        user.ban = {
            author: new mongoose.Types.ObjectId(currentUserId!),
            note,
            date: new Date()
        };
    }

    try {
        await user.save();

        res.json({
            success: true, data: {
                active: user.active,
                ban: user.active ? null : user.ban
            }
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err
        })
    }
});

const updateRoles = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { userId, roles } = req.body as { userId?: string; roles?: string[] };

    if (!Array.isArray(roles) || roles.some(r => typeof r !== "string")) {
        res.status(400).json({ message: "Invalid body" });
        return;
    }

    const user = await User.findById(userId);

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    try {
        user.roles = roles;
        await user.save();

        res.json({ success: true, data: { roles: user.roles } });
    } catch(err: any) {
        res.json({ message: "Roles not valid" });
    }
});


const controller = {
    getUsersList,
    banUser,
    getUser,
    updateRoles
};

export default controller;
