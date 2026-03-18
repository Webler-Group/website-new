import connectDB from "../config/dbConn";
import EvaluationJobModel, { EvaluationJob } from "../models/EvaluationJob";
import { BoxIdPool } from "../utils/BoxIdPool";
import { runInIsolate } from "../utils/isolate";
import { logEvents } from "../middleware/logger";
import ChallengeModel from "../models/Challenge";
import ChallengeSubmissionModel, { ChallengeSubmission } from "../models/ChallengeSubmission";
import ChallengeUnlockModel from "../models/ChallengeUnlock";
import UserModel from "../models/User";
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
                        passed: runResult ? x.expectedOutput.trim() == runResult.stdout.trim() : false,
                        output: runResult ? runResult.stdout.trim() : "",
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

                // Update Challenge stats for acceptance rate
                await ChallengeModel.updateOne(
                    { _id: job.challenge },
                    {
                        $inc: {
                            totalSubmissions: 1,
                            passedSubmissions: passed ? 1 : 0
                        }
                    }
                );

                // Award XP if passed for the first time
                if (passed) {
                    const alreadyPassed = await ChallengeSubmissionModel.exists({
                        challenge: job.challenge,
                        user: job.user,
                        passed: true,
                        _id: { $ne: submission._id }
                    });

                    if (!alreadyPassed) {
                        const hasUnlocked = await ChallengeUnlockModel.exists({
                            challenge: job.challenge,
                            user: job.user
                        });

                        const xpToAward = hasUnlocked ? 0 : (challenge.xp ?? 0);

                        if (xpToAward > 0) {
                            const user = await UserModel.findById(job.user);
                            if (user) {
                                user.xp += xpToAward;
                                await user.save(); // pre-save hook updates level
                                console.log(`Awarded ${xpToAward} XP to user ${user.name} for challenge ${challenge.title}`);
                            }
                        } else if (hasUnlocked) {
                             console.log(`User ${job.user} passed challenge ${challenge.title} but XP is 0 (solution unlocked)`);
                        }
                    }
                }
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
