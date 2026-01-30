"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dbConn_1 = __importDefault(require("../config/dbConn"));
const EvaluationJob_1 = __importDefault(require("../models/EvaluationJob"));
const BoxIdPool_1 = require("../utils/BoxIdPool");
const isolate_1 = require("../utils/isolate");
const logger_1 = require("../middleware/logger");
const Challenge_1 = __importDefault(require("../models/Challenge"));
const ChallengeSubmission_1 = __importDefault(require("../models/ChallengeSubmission"));
const boxIdPool = new BoxIdPool_1.BoxIdPool(100, 10000);
const CONCURRENCY = 4;
async function processSingleJob(job) {
    const boxId = await boxIdPool.acquire();
    try {
        job.status = "running";
        await job.save();
        console.log(`Running job ${job._id} in box ${boxId}`);
        const result = await (0, isolate_1.runInIsolate)(job.source, job.language, boxId, job.stdin);
        job.status = "done";
        job.result = result;
        console.log(`Job ${job._id} is done`);
    }
    catch (err) {
        job.status = "error";
        (0, logger_1.logEvents)(`Job ${job._id} failed with error: ${err.message}`, "codeRunnerErrLog.log");
    }
    finally {
        boxIdPool.release(boxId);
    }
    try {
        if ((job.status == "done" || job.status == "error") && job.challenge != null && job.user != null) {
            const challenge = await Challenge_1.default.findById(job.challenge, "-description");
            if (challenge) {
                let testResults = challenge.testCases.map((x, i) => {
                    const runResult = job.result ? job.result.runResults[i] : null;
                    return (i == 0 || runResult != null) ? {
                        passed: runResult ? x.expectedOutput == runResult.stdout : false,
                        output: runResult ? runResult.stdout : "",
                        stderr: (job.result?.compileErr ?? "") + (runResult ? runResult.stderr : ""),
                        time: runResult?.time
                    } : null;
                }).filter(x => x != null);
                const passed = testResults.every(x => x.passed);
                const submissions = await ChallengeSubmission_1.default.find({
                    challenge: job.challenge,
                    user: job.user,
                    language: job.language
                })
                    .sort({ updatedAt: "desc" })
                    .limit(1);
                let submission = submissions.length > 0 ? submissions[0] : null;
                if (submission) {
                    submission.testResults = testResults;
                    submission.passed = passed;
                    if (passed) {
                        submission.source = job.source;
                    }
                    await submission.save();
                }
                else {
                    submission = await ChallengeSubmission_1.default.create({
                        challenge: job.challenge,
                        user: job.user,
                        language: job.language,
                        testResults,
                        passed,
                        source: passed ? job.source : undefined
                    });
                }
                job.submission = submission._id;
            }
        }
        await job.save();
    }
    catch (err) {
        (0, logger_1.logEvents)(`Job ${job._id} failed to save: ${err.message}`, "codeRunnerErrLog.log");
    }
}
async function processJobs() {
    await (0, dbConn_1.default)();
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
