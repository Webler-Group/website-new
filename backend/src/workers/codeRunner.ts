// import { io, Socket } from "socket.io-client";
import connectDB from "../config/dbConn";
import EvaluationJob from "../models/EvaluationJob";
import { BoxIdPool } from "../utils/BoxIdPool";
import { runInIsolate } from "../utils/isolate";
import { config } from "../confg";
import { signAccessToken } from "../utils/tokenUtils";
import User from "../models/User";
import { logEvents } from "../middleware/logger";

const boxIdPool = new BoxIdPool(100, 10000);
const CONCURRENCY = 4;

async function processSingleJob(job: any) {
    const boxId = await boxIdPool.acquire();
    try {
        job.status = "running";
        await job.save();
        console.log(`Running job ${job._id} in box ${boxId}`);

        const result = await runInIsolate(job.source, job.language, boxId, job.stdin);

        job.status = "done";
        job.result = result;

        console.log(`Job ${job._id} is done`);
    } catch (err: any) {
        job.status = "error";
        job.result = { index: 0, stderr: err.message };

        logEvents(`Job ${job._id} failed with error: ${err.message}`, "codeRunnerErrLog.log");
    }

    boxIdPool.release(boxId);
    try {
        await job.save();
    } catch(err: any) {
        logEvents(`Job ${job._id} failed with error: ${err.message}`, "codeRunnerErrLog.log");
    }
}

async function processJobs() {
    await connectDB();

    while (true) {
        const jobs = await EvaluationJob.find({ status: "pending" }).limit(CONCURRENCY);
        if (jobs.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
        }

        await Promise.all(jobs.map(job => processSingleJob(job)));
    }
}

processJobs().catch(err => {
    console.error("Worker crashed:", err);
    process.exit(1);
});
