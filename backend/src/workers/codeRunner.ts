import connectDB from "../config/dbConn";
import EvaluationJob from "../models/EvaluationJob";
import { BoxIdPool } from "../utils/BoxIdPool";
import { runInIsolate } from "../utils/isolate";

const boxIdPool = new BoxIdPool(100, 10000);
const CONCURRENCY = 4;

async function processSingleJob(job: typeof EvaluationJob.prototype) {
    const boxId = await boxIdPool.acquire();
    try {
        job.status = "running";
        await job.save();
        console.log(`Running job ${job._id} in box ${boxId}`);

        const { stderr, stdout } = await runInIsolate(job.source, job.language, boxId, job.stdin);

        job.status = "done";
        job.stdout = stdout;
        job.stderr = stderr;

        console.log(`Job ${job._id} is done`);
    } catch (err: any) {
        job.status = "error";
        job.stderr = err.message;

        console.log(`Job ${job._id} failed with error: ${err.message}`);
    } finally {
        boxIdPool.release(boxId);
        await job.save();
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
