import mongoose from "mongoose";
import { config } from "../confg";
import { logEvents } from "../middleware/logger";

const connectDB = async () => {
    mongoose.connection.once("open", () => {
        console.log("Connected to DB successfully");
    });

    mongoose.connection.once("error", (err: any) => {
        logEvents(`${err.name}: ${err.message}`, 'mongoErrLog.log');
    });

    await mongoose.connect(config.databaseUri);
}

export default connectDB;