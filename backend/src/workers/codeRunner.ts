import connectDB from "../config/dbConn";
import EvaluationJob from "../models/EvaluationJob";
import { BoxIdPool } from "../utils/BoxIdPool";
import { runInIsolate } from "../utils/isolate";

const boxIdPool = new BoxIdPool(100, 10000);

async function processJobs() {
    await connectDB();

    while(true) {
        const job = await EvaluationJob.findOne({ status: "pending" });
        
        if(!job) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }
        
        job.status = "running";
        await job.save();
        console.log(`Running job ${job._id}`);

        const boxId = await boxIdPool.acquire();
        try {
            const {stderr, stdout} = await runInIsolate(job.source, job.language, boxId, job.stdin);

            job.status = "done";
            job.stdout = stdout;
            job.stderr = stderr;
        } catch(err: any) {
            job.status = "error";
            job.stderr = err.message;
        } finally {
            boxIdPool.release(boxId);
        }

        await job.save();
    }
}

processJobs().catch(err => {
    console.error("Worker crashed:", err);
    process.exit(1);
});