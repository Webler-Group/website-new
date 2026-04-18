import { Response } from "express";
import { IAuthRequest } from "../middleware/verifyJWT";
import UserModel, { User, USER_ADMIN_MINIMAL_FIELDS, UserAdminMinimal } from "../models/User";
import asyncHandler from "express-async-handler";
import mongoose, { Types } from "mongoose";
import { escapeRegex } from "../utils/regexUtils";
import RolesEnum from "../data/RolesEnum";
import {
    getUsersListSchema,
    getUserSchema,
    banUserSchema,
    updateRolesSchema,
    deleteUserFilesSchema,
    toggleBanIpSchema,
    getIpListSchema,
    createIpSchema,
    updateUserXpSchema
} from "../validation/adminSchema";
import { parseWithZod } from "../utils/zodUtils";
import PostModel from "../models/Post";
import CodeModel from "../models/Code";
import NotificationModel from "../models/Notification";
import { withTransaction } from "../utils/transaction";
import { formatUserAdmin, formatUserAdminMinimal } from "../helpers/userHelper";
import HttpError from "../exceptions/HttpError";
import FileModel from "../models/File";
import { deleteSingleFile } from "../helpers/fileHelper";
import IpModel, { Ip } from "../models/Ip";

const getUsersList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUsersListSchema, req);
    const { search, count, page, filter, role, active } = body;

    const query: mongoose.QueryFilter<User> = {};

    if (search && search.trim().length > 0) {
        query.name = new RegExp(escapeRegex(search.trim()), "i");
    }

    if (role) {
        query.roles = role;
    }

    if (active !== undefined) {
        query.active = active;
    }

    const sortMap: Record<number, Record<string, "asc" | "desc">> = {
        1: { createdAt: "desc" },
        2: { createdAt: "asc" },
        3: { lastLoginAt: "desc" },
        4: { lastLoginAt: "asc" }
    };
    const sort = sortMap[filter ?? 1];

    const users = await UserModel.find(query, { ...USER_ADMIN_MINIMAL_FIELDS })
        .sort(sort)
        .skip((page - 1) * count)
        .limit(count)
        .lean<(UserAdminMinimal)[]>();

    const total = await UserModel.countDocuments(query);

    res.json({
        success: true,
        data: {
            users: users.map(u => formatUserAdminMinimal(u)),
            count: total
        }
    });
});

const getUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getUserSchema, req);
    const { userId } = body;

    const user = await UserModel.findById(userId)
        .populate<{ ips: { _id: Types.ObjectId; value: string; banned: boolean }[]; lastIp?: { _id: Types.ObjectId; value: string; banned: boolean } }>("ips lastIp")
        .lean();

    if (!user) {
        throw new HttpError("User not found", 404);
    }

    res.json({
        success: true,
        data: {
            user: formatUserAdmin(user)
        }
    });
});

const banUser = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(banUserSchema, req);
    const { userId, active, note } = body;
    const currentUserId = req.userId;

    const result = await withTransaction(async (session) => {
        const user = await UserModel.findById(userId).session(session);
        if (!user) throw new HttpError("User not found", 404);

        if (user.roles.includes(RolesEnum.ADMIN)) throw new HttpError("Unauthorized", 403);

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

    res.json({ success: true, data: result });
});

const updateRoles = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(updateRolesSchema, req);
    const { userId, roles } = body;

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new HttpError("User not found", 404);
    }

    user.roles = roles;
    await user.save();

    res.json({ success: true, data: { roles: user.roles } });
});

const deleteUserFiles = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(deleteUserFilesSchema, req);
    const { userId } = body;

    const deletedCount = await withTransaction(async (session) => {
        const user = await UserModel.findById(userId).session(session);
        if (!user) throw new HttpError("User not found", 404);

        const files = await FileModel.find({ author: userId }).session(session);

        for (const file of files) {
            await deleteSingleFile(file, session);
        }

        user.avatarHash = undefined;
        user.avatarFileId = undefined;
        await user.save({ session });

        return files.length;
    });

    res.json({ success: true, data: { deletedCount } });
});

const toggleBanIp = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(toggleBanIpSchema, req);
    const { ipId, banned } = body;

    const ip = await IpModel.findById(ipId);
    if (!ip) throw new HttpError("IP not found", 404);

    ip.banned = banned;
    await ip.save();

    res.json({ success: true, data: { id: ip._id.toString(), banned: ip.banned } });
});

const getIpList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(getIpListSchema, req);
    const { count, page, banned, value } = body;

    const filter: mongoose.QueryFilter<Ip> = {};

    if (banned !== undefined) {
        filter.banned = banned;
    }

    if (value && value.trim().length > 0) {
        filter.value = new RegExp(escapeRegex(value.trim()), "i");
    }

    const ips = await IpModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * count)
        .limit(count)
        .lean<(Ip & { _id: Types.ObjectId })[]>();

    const total = await IpModel.countDocuments(filter);

    res.json({
        success: true,
        data: {
            ips: ips.map(ip => ({ id: ip._id.toString(), value: ip.value, banned: ip.banned, description: ip.description })),
            count: total
        }
    });
});

const createIp = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(createIpSchema, req);
    const { value } = body;

    const existing = await IpModel.exists({ value });
    if (existing) throw new HttpError("IP already exists", 409);

    const ip = await IpModel.create({ value });

    res.json({ success: true, data: { id: ip._id.toString(), value: ip.value, banned: ip.banned } });
});

const updateUserXp = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { body } = parseWithZod(updateUserXpSchema, req);
    const { userId, xp } = body;

    const user = await UserModel.findById(userId);
    if (!user) throw new HttpError("User not found", 404);

    user.xp = xp;
    await user.save();

    res.json({ success: true, data: { level: user.level, xp } });
});

const controller = {
    getUsersList,
    banUser,
    getUser,
    updateRoles,
    deleteUserFiles,
    toggleBanIp,
    getIpList,
    createIp,
    updateUserXp
};

export default controller;