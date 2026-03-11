import mongoose from "mongoose";

export const withTransaction = async <T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        await session.endSession();
    }
};