import cron from "node-cron";
import connectDB from "../config/dbConn";
import EvaluationJob from "../models/EvaluationJob";
import { dump } from "../utils/dbUtils";
import { config } from "../confg";
import { logEvents } from "../middleware/logger";

function guarded(name: string, fn: () => Promise<void>) {
    let running = false;
    return async () => {
        if (running) {
            logEvents(`${name} skipped: previous run still in progress`, "cronLog.log");
            return;
        }
        running = true;
        try {
            await fn();
        } catch (err: any) {
            logEvents(`${name} failed: ${err.message}`, "cronErrLog.log");
        } finally {
            running = false;
        }
    };
}

async function main() {
    await connectDB();

    cron.schedule("0 * * * *", guarded("cleanup-evaluation-jobs", async () => {
        const result = await EvaluationJob.deleteMany({
            createdAt: { $lt: new Date(Date.now() - 1000 * 60) }
        });
        logEvents(`Deleted ${result.deletedCount} old evaluation jobs`, "cronLog.log");
    }), { timezone: "UTC" });

    cron.schedule("0 2 * * *", guarded("db-dump", async () => {
        await dump(config.dumpDir);
    }), { timezone: "UTC" });

    console.log("Cron worker started");
}

process.on("unhandledRejection", (e) => console.error("unhandledRejection", e));
main().catch((e) => { console.error("Cron worker crashed:", e); process.exit(1); });