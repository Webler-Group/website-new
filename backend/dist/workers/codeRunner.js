"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { io, Socket } from "socket.io-client";
const dbConn_1 = __importDefault(require("../config/dbConn"));
const EvaluationJob_1 = __importDefault(require("../models/EvaluationJob"));
const BoxIdPool_1 = require("../utils/BoxIdPool");
const isolate_1 = require("../utils/isolate");
const logger_1 = require("../middleware/logger");
const boxIdPool = new BoxIdPool_1.BoxIdPool(100, 10000);
const CONCURRENCY = 4;
// const deviceId = "worker-" + process.pid;
// let socket: Socket;
async function processSingleJob(job) {
    const boxId = await boxIdPool.acquire();
    try {
        job.status = "running";
        await job.save();
        console.log(`Running job ${job._id} in box ${boxId}`);
        const { stderr, stdout } = await (0, isolate_1.runInIsolate)(job.source, job.language, boxId, job.stdin);
        job.status = "done";
        job.stdout = stdout;
        job.stderr = stderr;
        console.log(`Job ${job._id} is done`);
    }
    catch (err) {
        job.status = "error";
        job.stderr = err.message;
        (0, logger_1.logEvents)(`Job ${job._id} failed with error: ${err.message}`, "codeRunnerErrLog.log");
    }
    boxIdPool.release(boxId);
    try {
        await job.save();
        // socket.emit("job:finished", {
        //     jobId: job._id
        // });
    }
    catch (err) {
        (0, logger_1.logEvents)(`Job ${job._id} failed with error: ${err.message}`, "codeRunnerErrLog.log");
    }
}
async function processJobs() {
    await (0, dbConn_1.default)();
    // const adminUser = await User.findOne({ email: config.adminEmail });
    // let token = null;
    // if (adminUser) {
    //     const { accessToken } = await signAccessToken({ userId: adminUser._id.toString(), roles: adminUser.roles }, deviceId);
    //     token = accessToken;
    // }
    // socket = io("http://localhost:" + config.port, {
    //     auth: {
    //         deviceId,
    //         token
    //     }
    // });
    while (true) {
        const jobs = await EvaluationJob_1.default.find({ status: "pending" }).limit(CONCURRENCY);
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
