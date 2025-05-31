import mongoose from "mongoose";
import { config } from "../confg";

const connectDB = async () => {
    try {
        await mongoose.connect(config.databaseUri);
        console.log("Connected to DB successfully");
    }
    catch(err) {
        console.log(err);
    }
}

export default connectDB;