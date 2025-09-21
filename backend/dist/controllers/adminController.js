"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
const regexUtils_1 = require("../utils/regexUtils");
const RolesEnum_1 = __importDefault(require("../data/RolesEnum"));
const adminSchema_1 = require("../validation/adminSchema");
const zodUtils_1 = require("../utils/zodUtils");
const getUsersList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(adminSchema_1.getUsersListSchema, req);
    const { search, count, page, date, role, active } = body;
    const filter = {};
    if (search && search.trim().length > 0) {
        const safeQuery = (0, regexUtils_1.escapeRegex)(search.trim());
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
    const users = await User_1.default.find(filter)
        .select("_id email countryCode name avatarImage roles createdAt level emailVerified active ban")
        .sort({ createdAt: -1 })
        .skip((page - 1) * count)
        .limit(count);
    const total = await User_1.default.countDocuments(filter);
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
const getUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(adminSchema_1.getUserSchema, req);
    const { userId } = body;
    const user = await User_1.default.findById(userId)
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
const banUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(adminSchema_1.banUserSchema, req);
    const { userId, active, note } = body;
    const currentUserId = req.userId;
    const user = await User_1.default.findById(userId);
    if (!user) {
        res.status(404).json({ error: [{ message: "User not found" }] });
        return;
    }
    if (user.roles.includes(RolesEnum_1.default.ADMIN)) {
        res.status(403).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    user.active = active;
    if (!user.active) {
        user.ban = {
            author: new mongoose_1.default.Types.ObjectId(currentUserId),
            note,
            date: new Date()
        };
    }
    else {
        user.ban = null;
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
const updateRoles = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(adminSchema_1.updateRolesSchema, req);
    const { userId, roles } = body;
    const user = await User_1.default.findById(userId);
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
exports.default = controller;
