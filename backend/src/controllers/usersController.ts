import User from "../models/User";
import expressAsyncHandler from "express-async-handler";
import bcrypt from "bcrypt";

const createNewUser = expressAsyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const userObject = {
        email,
        password
    };

    const user = await User.create(userObject);

    if(user) {
        res.status(201).json({ user });
    }
    else {
        res.status(400).json({ message: "Invalid user data received" });
    }
})

export default {
    createNewUser
}