import { Queue } from "bullmq";
import crypto from "crypto";
import { config } from "../confg";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

export const EVALUATION_QUEUE_NAME = "evaluation";

// How long finished jobs stay in Redis so clients can still poll the result
const FINISHED_JOB_TTL_SECONDS = 10 * 60;

export interface RunResult {
    stdout: string;
    stderr: string;
    time?: number;
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
}

export interface EvaluationJobResult {
    result: EvaluationResult;
    submissionId?: string;
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
