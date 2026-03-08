import connectDB from "../config/dbConn";
import EvaluationJobModel, { EvaluationJob } from "../models/EvaluationJob";
import { BoxIdPool } from "../utils/BoxIdPool";
import { runInIsolate } from "../utils/isolate";
import { logEvents } from "../middleware/logger";
import ChallengeModel from "../models/Challenge";
import ChallengeSubmissionModel, { ChallengeSubmission } from "../models/ChallengeSubmission";
import { DocumentType } from "@typegoose/typegoose";

const boxIdPool = new BoxIdPool(100, 10000);
const CONCURRENCY = 4;

async function processSingleJob(job: DocumentType<EvaluationJob>) {
    const boxId = await boxIdPool.acquire();
    try {
        job.status = "running";
        await job.save();
        console.log(`Running job ${job._id} in box ${boxId}`);

        const result = await runInIsolate(job.source, job.language, boxId, job.stdin);

        job.status = "done";
        job.result = result;

        console.log(`Job ${job._id} is done`);
    } catch (err) {
        job.status = "error";

        if (err instanceof Error) {
            logEvents(`Job ${job._id} failed with error: ${err.message}`, "codeRunnerErrLog.log");
        }
    } finally {
        boxIdPool.release(boxId);
    }

    try {
        if ((job.status == "done" || job.status == "error") && job.challenge != null && job.user != null) {
            const challenge = await ChallengeModel.findById(job.challenge, { description: 0 });
            if (challenge) {
                let testResults = challenge.testCases.map((x, i) => {
                    const runResult = job.result ? job.result.runResults[i] : null;
                    return (i == 0 || runResult != null) ? {
                        passed: runResult ? x.expectedOutput == runResult.stdout : false,
                        output: runResult ? runResult.stdout : "",
                        stderr: (job.result?.compileErr ?? "") + (runResult ? runResult.stderr : ""),
                        time: runResult?.time
                    } : null
                }).filter(x => x != null);
                const passed = testResults.every(x => x!.passed);

                const submissions = await ChallengeSubmissionModel.find({
                    challenge: job.challenge,
                    user: job.user,
                    language: job.language
                })
                    .sort({ updatedAt: "desc" })
                    .limit(1);

                let submission: DocumentType<ChallengeSubmission> | null = submissions.length > 0 ? submissions[0] : null;

                if (submission) {
                    submission.testResults = testResults;
                    submission.passed = passed;
                    if (passed) {
                        submission.source = job.source;
                    }
                    await submission.save();
                } else {
                    submission = await ChallengeSubmissionModel.create({
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
    } catch (err) {
        if (err instanceof Error) {
            logEvents(`Job ${job._id} failed to save: ${err.message}`, "codeRunnerErrLog.log");
        }
    }
}

async function processJobs() {
    await connectDB();

    while (true) {
        const jobs = await EvaluationJobModel.find({ status: "pending" }).limit(CONCURRENCY);
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
