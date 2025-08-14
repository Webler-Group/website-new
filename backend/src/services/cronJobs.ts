import cron from "node-cron";
import EvaluationJob from "../models/EvaluationJob";
import { dump } from "../utils/dbUtils";
import { config } from "../confg";
import { logEvents } from "../middleware/logger";

export const initCronJobs = () => {
    // This will run every day at midnight
    cron.schedule("0 * * * *", async () => {
        try {
            const result = await EvaluationJob.deleteMany({
                createdAt: { $lt: new Date(Date.now() - 1000 * 60) }
            });
            
            logEvents(`Deleted ${result.deletedCount} old evaluation jobs`, "cronLog.log");
        } catch (err: any) {
            logEvents("Deleting old evaluation jobs failed with error: " + err.message, "cronErrLog.log");
        }
    });

    cron.schedule("0 0 * * *", async () => {
        dump(config.dumpDir);
    });
}
