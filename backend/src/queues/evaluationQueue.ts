import { Queue } from "bullmq";
import crypto from "crypto";
import { config } from "../confg";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import HttpError from "../exceptions/HttpError";
import type { AwardedXp } from "../helpers/xpHelper";
import type { RunVerdict } from "../utils/sandbox";

export const EVALUATION_QUEUE_NAME = "evaluation";

// How long finished jobs stay in Redis. Clients poll while the job runs and fetch the result
// within ~1.5 s of it finishing, so this only needs to cover slow networks and retries.
const FINISHED_JOB_TTL_SECONDS = 2 * 60;

// Reject new jobs when this many are already waiting, so a flood of submissions
// can't build an unbounded backlog that delays everyone
const MAX_WAITING_JOBS = Number(process.env.MAX_WAITING_JOBS) || 200;

export interface RunImage {
    name: string;
    width: number;
    height: number;
    // Base64-encoded PNG
    data: string;
}

export interface RunResult {
    stdout: string;
    stderr: string;
    // Seconds of CPU time
    time?: number;
    // Peak memory in KB
    memory?: number;
    // Why the run failed, when it did
    verdict?: RunVerdict;
    // PNG file the program saved into ./output
    image?: RunImage;
    // Crashed or hit a limit; later inputs were not run
    failed?: boolean;
}

export interface EvaluationResult {
    compileErr?: string;
    runResults: RunResult[];
}

export interface EvaluationJobData {
    language: CompilerLanguagesEnum;
    source: string;
    stdin: string[];
    deviceId: string;
    challengeId?: string;
    userId?: string;
    // Challenge test cases and limits when the job was created, so the results are judged
    // against the test cases that were run even if the challenge is edited meanwhile.
    // Missing in jobs queued before these fields were added.
    testCases?: { input: string; expectedOutput: string; isHidden: boolean }[];
    timeLimit?: number;
    memoryLimit?: number;
}

export interface EvaluationJobResult {
    result: EvaluationResult;
    submissionId?: string;
    /** XP awarded to the submitting user for this evaluation (only when some XP was awarded) */
    xpAwarded?: AwardedXp;
}

export type EvaluationJobStatus = "pending" | "running" | "done" | "error";

export const redisConnection = { url: config.redisUrl };

let queue: Queue<EvaluationJobData, EvaluationJobResult> | null = null;

function getQueue() {
    if (!queue) {
        queue = new Queue<EvaluationJobData, EvaluationJobResult>(EVALUATION_QUEUE_NAME, {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 1,
                removeOnComplete: { age: FINISHED_JOB_TTL_SECONDS },
                removeOnFail: { age: FINISHED_JOB_TTL_SECONDS }
            }
        });
        queue.on("error", (err) => console.error("Evaluation queue error:", err.message));
    }
    return queue;
}

export async function addEvaluationJob(data: EvaluationJobData) {
    // Random id so job results can't be enumerated by guessing sequential ids
    const jobId = crypto.randomUUID();
    if (await getQueue().getWaitingCount() >= MAX_WAITING_JOBS) {
        throw new HttpError("Code runner is busy, try again in a moment", 503);
    }
    await getQueue().add("evaluate", data, { jobId });
    return jobId;
}

function mapState(state: string): EvaluationJobStatus | null {
    switch (state) {
        case "waiting":
        case "wait":
        case "prioritized":
        case "delayed":
        case "waiting-children":
            return "pending";
        case "active":
            return "running";
        case "completed":
            return "done";
        case "failed":
            return "error";
        default:
            return null;
    }
}

export async function getEvaluationJob(jobId: string) {
    const job = await getQueue().getJob(jobId);
    if (!job) {
        return null;
    }

    const status = mapState(await job.getState());
    if (!status) {
        return null;
    }

    return {
        id: job.id as string,
        status,
        data: job.data as EvaluationJobData,
        returnValue: (status === "done" ? job.returnvalue : null) as EvaluationJobResult | null
    };
}
