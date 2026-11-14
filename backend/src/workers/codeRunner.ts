import { Job, Worker } from "bullmq";
import connectDB from "../config/dbConn";
import { config } from "../confg";
import { cleanupSandboxLeftovers, ensureSandboxImages, runInSandbox } from "../utils/sandbox";
import { logEvents } from "../middleware/logger";
import ChallengeModel from "../models/Challenge";
import ChallengeSubmissionModel, { ChallengeSubmission, TestResult } from "../models/ChallengeSubmission";
import TestVerdictEnum from "../data/TestVerdictEnum";
import { AwardedXp, awardChallengeXp } from "../helpers/xpHelper";
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

async function evaluateChallenge(
    data: EvaluationJobData & { challengeId: string; userId: string },
    result: EvaluationResult
): Promise<{ submissionId: string; xpAwarded?: AwardedXp } | undefined> {
    const challenge = await ChallengeModel.findById(data.challengeId, { description: 0 });
    if (!challenge) {
        return undefined;
    }

    // Judge against the test cases and time limit the job was created with (older jobs don't carry them)
    const testCases = data.testCases ?? challenge.testCases;
    const timeLimit = data.testCases ? data.timeLimit : challenge.timeLimit;

    const testResults: TestResult[] = testCases.map((x, i) => {
        const runResult = result.runResults[i];
        const testCase = { input: x.input, expectedOutput: x.expectedOutput, isHidden: x.isHidden };
        if (!runResult) {
            // Compile errors are shown with the first test
            const compileFailed = i === 0 && !!result.compileErr;
            return {
                ...testCase,
                passed: false,
                verdict: compileFailed ? TestVerdictEnum.COMPILE_ERROR : TestVerdictEnum.NOT_RUN,
                output: "",
                stderr: compileFailed ? result.compileErr : ""
            };
        }
        const correct = x.expectedOutput.trim() == runResult.stdout.trim();
        const verdict = runResult.verdict as TestVerdictEnum | undefined
            ?? (runResult.failed ? TestVerdictEnum.RUNTIME_ERROR : correct ? TestVerdictEnum.ACCEPTED : TestVerdictEnum.WRONG_ANSWER);
        return {
            ...testCase,
            passed: verdict === TestVerdictEnum.ACCEPTED,
            verdict,
            output: runResult.stdout.trim(),
            stderr: (result.compileErr ?? "") + runResult.stderr,
            time: runResult.time,
            memory: runResult.memory
        };
    });
    const passed = testResults.length > 0 && testResults.every(x => x.passed);

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
        submission.timeLimit = timeLimit;
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
            timeLimit,
            passed,
            everPassed: passed,
            source: passed ? data.source : undefined
        });
    }

    // XP for every newly solved challenge + language combination (idempotent, see awardChallengeXp)
    let xpAwarded: AwardedXp | undefined;
    if (passed) {
        const awarded = await awardChallengeXp({
            userId: data.userId,
            challengeId: data.challengeId,
            difficulty: challenge.difficulty,
            language: data.language
        });
        if (awarded.total > 0) {
            console.log(`Awarded ${awarded.total} XP to user ${data.userId} for challenge ${challenge.title} (${data.language})`);
            xpAwarded = awarded;
        }
    }

    return { submissionId: submission._id.toString(), xpAwarded };
}

async function processJob(job: Job<EvaluationJobData, EvaluationJobResult>): Promise<EvaluationJobResult> {
    const data = job.data;
    let result: EvaluationResult;

    try {
        console.log(`Running job ${job.id}`);
        // Progress is only for the user waiting on the result, so a failed update must not fail the job
        result = await runInSandbox(data.source, data.language, data.stdin, { timeLimit: data.timeLimit },
            progress => job.updateProgress(progress).catch(() => { }));
    } catch (err) {
        logEvents(`Job ${job.id} failed with error: ${err instanceof Error ? err.message : err}`, "codeRunnerErrLog.log");
        throw err;
    }

    let evaluation: Awaited<ReturnType<typeof evaluateChallenge>>;
    const { challengeId, userId } = data;
    if (challengeId && userId) {
        try {
            evaluation = await evaluateChallenge({ ...data, challengeId, userId }, result);
        } catch (err) {
            logEvents(`Job ${job.id} failed to save submission: ${err instanceof Error ? err.message : err}`, "codeRunnerErrLog.log");
            throw err;
        }
    }

    console.log(`Job ${job.id} is done`);
    return { result, submissionId: evaluation?.submissionId, xpAwarded: evaluation?.xpAwarded };
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
