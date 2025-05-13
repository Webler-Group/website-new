import mongoose from "mongoose";
import { config } from "../confg";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.databaseUri);
    }
    catch(err) {
        console.log(err);
    }
}

export default connectDB;