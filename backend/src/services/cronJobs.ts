import cron from "node-cron";
import EvaluationJob from "../models/EvaluationJob";
import { dump } from "../utils/dbUtils";
import { config } from "../confg";

export const initCronJobs = () => {
    // This will run every day at midnight
    cron.schedule("0 * * * *", async () => {
        try {
            const result = await EvaluationJob.deleteMany({
                createdAt: { $lt: new Date(Date.now() - 1000 * 60 * 5) } // older than 7 days
            });
            console.log(`[CRON] Deleted ${result.deletedCount} old evaluation jobs`);
        } catch (err) {
            console.error("[CRON] Error deleting old evaluation jobs:", err);
        }
    });

    cron.schedule("0 0 * * *", async () => {
        dump(config.dumpDir);
    });
}
