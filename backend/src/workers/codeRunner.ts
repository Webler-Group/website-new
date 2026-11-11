import { Job, Worker } from "bullmq";
import connectDB from "../config/dbConn";
import { config } from "../confg";
import { cleanupSandboxLeftovers, ensureSandboxImages, runInSandbox } from "../utils/sandbox";
import { logEvents } from "../middleware/logger";
import ChallengeModel from "../models/Challenge";
import ChallengeSubmissionModel, { ChallengeSubmission } from "../models/ChallengeSubmission";
import { awardChallengeXp } from "../helpers/xpHelper";
import { DocumentType } from "@typegoose/typegoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import {
    EVALUATION_QUEUE_NAME,
    EvaluationJobData,
    EvaluationJobResult,
    EvaluationResult,
    redisConnection
} from "../queues/evaluationQueue";

const CONCURRENCY = config.codeRunnerConcurrency;

async function evaluateChallenge(data: EvaluationJobData & { challengeId: string; userId: string }, result: EvaluationResult) {
    const challenge = await ChallengeModel.findById(data.challengeId, { description: 0 });
    if (!challenge) {
        return undefined;
    }

    const testResults = challenge.testCases.map((x, i) => {
        const runResult = result.runResults[i] ?? null;
        return (i == 0 || runResult != null) ? {
            passed: runResult ? !runResult.failed && x.expectedOutput.trim() == runResult.stdout.trim() : false,
            output: runResult ? runResult.stdout.trim() : "",
            stderr: (result.compileErr ?? "") + (runResult ? runResult.stderr : ""),
            time: runResult?.time
        } : null
    }).filter(x => x != null);
    const passed = result.runResults.length === challenge.testCases.length && testResults.every(x => x!.passed);

    const submissions = await ChallengeSubmissionModel.find({
        challenge: data.challengeId,
        user: data.userId,
        language: data.language
    })
        .sort({ updatedAt: "desc" })
        .limit(1);

    // Update Challenge stats for acceptance rate (before submission save so it always runs)
    await ChallengeModel.updateOne(
        { _id: data.challengeId },
        {
            $inc: {
                totalSubmissions: 1,
                passedSubmissions: passed ? 1 : 0
            }
        }
    );

    let submission: DocumentType<ChallengeSubmission> | null = submissions.length > 0 ? submissions[0] : null;

    if (submission) {
        submission.testResults = testResults;
        submission.passed = passed;
        if (passed) {
            submission.source = data.source;
            submission.everPassed = true;
        }
        await submission.save();
    } else {
        submission = await ChallengeSubmissionModel.create({
            challenge: data.challengeId,
            user: data.userId,
            language: data.language,
            testResults,
            passed,
            everPassed: passed,
            source: passed ? data.source : undefined
        });
    }

    // XP for every newly solved challenge + language combination (idempotent, see awardChallengeXp)
    if (passed) {
        const awarded = await awardChallengeXp({
            userId: data.userId,
            challengeId: data.challengeId,
            difficulty: challenge.difficulty,
            language: data.language
        });
        if (awarded.total > 0) {
            console.log(`Awarded ${awarded.total} XP to user ${data.userId} for challenge ${challenge.title} (${data.language})`);
        }
    }

    return submission._id.toString();
}

async function processJob(job: Job<EvaluationJobData, EvaluationJobResult>): Promise<EvaluationJobResult> {
    const data = job.data;
    let result: EvaluationResult;

    try {
        console.log(`Running job ${job.id}`);
        result = await runInSandbox(data.source, data.language, data.stdin);
    } catch (err) {
        logEvents(`Job ${job.id} failed with error: ${err instanceof Error ? err.message : err}`, "codeRunnerErrLog.log");
        throw err;
    }

    let submissionId: string | undefined;
    const { challengeId, userId } = data;
    if (challengeId && userId) {
        try {
            submissionId = await evaluateChallenge({ ...data, challengeId, userId }, result);
        } catch (err) {
            logEvents(`Job ${job.id} failed to save submission: ${err instanceof Error ? err.message : err}`, "codeRunnerErrLog.log");
            throw err;
        }
    }

    console.log(`Job ${job.id} is done`);
    return { result, submissionId };
}

async function main() {
    await connectDB();

    // Fail fast if Docker isn't usable, and download missing images before taking jobs
    await ensureSandboxImages(Object.values(CompilerLanguagesEnum));
    // Containers and job dirs may be left behind if the previous process crashed
    await cleanupSandboxLeftovers();

    const worker = new Worker<EvaluationJobData, EvaluationJobResult>(EVALUATION_QUEUE_NAME, processJob, {
        connection: redisConnection,
        concurrency: CONCURRENCY,
        // Job that was running when a worker died is retried once, then marked failed
        maxStalledCount: 1
    });

    worker.on("error", (err) => console.error("Worker error:", err.message));
    worker.on("failed", (job, err) => {
        if (job) console.warn(`Job ${job.id} failed: ${err.message}`);
    });

    console.log(`Code runner started (worker ${config.codeRunnerWorkerId}, concurrency ${CONCURRENCY})`);

    let shuttingDown = false;
    const shutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log("Code runner shutting down, waiting for active jobs...");
        await worker.close();
        process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

main().catch(err => {
    console.error("Worker crashed:", err);
    process.exit(1);
});
