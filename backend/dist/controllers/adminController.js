"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
const regexUtils_1 = require("../utils/regexUtils");
const getUsersList = (0, express_async_handler_1.default)(async (req, res) => {
    const { search, count, page, date, role, active } = req.body;
    // validate body (ignore search if undefined)
    if (typeof count !== "number" ||
        typeof page !== "number" ||
        count <= 0 || count > 100 ||
        page <= 0 ||
        (date && typeof date !== "string") ||
        (role && typeof role !== "string") ||
        (active !== undefined && typeof active !== "boolean")) {
        res.status(400).json({ message: "Invalid body" });
        return;
    }
    const filter = {};
    // name filter (only if search is non-empty)
    if (search && search.trim().length > 0) {
        const safeQuery = (0, regexUtils_1.escapeRegex)(search.trim());
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
    const users = await User_1.default.find(filter)
        .select("_id email countryCode name avatarImage roles createdAt level emailVerified active ban")
        .sort({ createdAt: -1 })
        .skip((page - 1) * count)
        .limit(count);
    const total = await User_1.default.countDocuments(filter);
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
const getUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.body;
    if (!userId || typeof userId !== "string") {
        res.status(400).json({ message: "Invalid body" });
        return;
    }
    const user = await User_1.default.findById(userId)
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
const banUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId, active, note } = req.body;
    const currentUserId = req.userId;
    const user = await User_1.default.findById(userId);
    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }
    if (user.roles.includes("Admin")) {
        res.status(404).json({ message: "Unauthorized" });
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
    try {
        await user.save();
        res.json({ success: true, data: {
                active: user.active,
                ban: user.active ? null : user.ban
            } });
    }
    catch (err) {
        res.json({
            success: false,
            error: err
        });
    }
});
const controller = {
    getUsersList,
    banUser,
    getUser
};
exports.default = controller;
