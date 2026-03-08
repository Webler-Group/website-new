import mongoose from "mongoose";

export const withTransaction = async <T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> => {
    const session = await mongoose.startSession();
    try {
        return await session.withTransaction(fn);
    } finally {
        await session.endSession();
    }
};