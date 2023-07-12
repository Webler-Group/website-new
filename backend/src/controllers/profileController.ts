import User from "../models/User";
import { Request, Response } from "express";

const getProfile = async (req: Request, res: Response) => {
    const { id: userId } = req.body;

    const user = await User.findById(userId);

    if(!user) {
        return res.status(404).json({ message: "Profile not found" });
    }

    res.json({ user });
    
}

export default {
    getProfile
};