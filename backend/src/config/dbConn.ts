import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URI as string);
    }
    catch(err) {
        console.log(err);
    }
}

export default connectDB;