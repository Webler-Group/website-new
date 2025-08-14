import { io, Socket } from "socket.io-client";
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
const deviceId = "worker-" + process.pid;
let socket: Socket;

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

        logEvents(`Job ${job._id} failed with error: ${err.message}`, "codeRunnerErrLog.log");
    }

    boxIdPool.release(boxId);

    try {
        await job.save();

        await socket.timeout(1000).emitWithAck("job:finished", {
            jobId: job._id
        });
    } catch(err: any) {
        logEvents(`Job ${job._id} failed with error: ${err.message}`, "codeRunnerErrLog.log");
    }
}

async function processJobs() {
    await connectDB();

    const adminUser = await User.findOne({ email: config.adminEmail });
    let token = null;
    if (adminUser) {
        const { accessToken } = await signAccessToken({ userId: adminUser._id.toString(), roles: adminUser.roles }, deviceId);
        token = accessToken;
    }

    socket = io("http://localhost:" + config.port, {
        auth: {
            deviceId,
            token
        }
    });

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
