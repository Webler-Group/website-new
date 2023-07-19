import mongoose from "mongoose";
import { IAuthRequest } from "../middleware/verifyJWT";
import User from "../models/User";
import { Response } from "express";
import asyncHandler from "express-async-handler";

const getProfile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return
    }

    res.json({
        userDetails: {
            id: user._id,
            name: user.name,
            email: currentUserId === user._id.toString() ? user.email : null,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            roles: user.roles,
            emailVerified: user.emailVerified,
            countryCode: user.countryCode,
            followers: user.followers,
            following: user.following,
            isFollowing: false,
            registerDate: user.createdAt,
            level: user.level,
            xp: user.xp
        }
    });

})

const updateProfile = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const userId = req.params.userId;
    const { email, name, bio, countryCode } = req.body;

    if (currentUserId !== userId) {
        res.status(401).json({ message: "Not authorized for this action" });
        return
    }

    const user = await User.findById(userId);

    if (!user) {
        res.status(404).json({ message: "Profile not found" });
        return
    }

    if (typeof email !== "undefined") {
        user.email = email;
    }

    if (typeof name !== "undefined") {
        user.name = name;
    }

    if (typeof bio !== "undefined") {
        user.bio = bio;
    }

    if (typeof countryCode !== "undefined") {
        user.countryCode = countryCode;
    }

    try {
        const updatedUser = await user.save();

        res.json({
            success: true,
            errors: [],
            data: {
                id: updatedUser._id,
                email: updatedUser.email,
                name: updatedUser.name,
                bio: updatedUser.bio,
                countryCode: updatedUser.countryCode
            }
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            errors: Object.values(err.errors),
            data: null
        })
    }

})

export default {
    getProfile,
    updateProfile
};