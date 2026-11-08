// Polling schedule for code runner jobs: check quickly at first (most runs finish in about a
// second), then back off so long compiles and busy queues don't flood the server with requests.
const FIRST_DELAY_MS = 400;
const MAX_DELAY_MS = 1500;
const BACKOFF = 1.5;

type JobStatus = "pending" | "running" | "done" | "error" | string;

/**
 * Calls `fetchJob` until the job is no longer pending/running or `timeoutMs` has passed.
 * Returns the last response and its status ("timeout" if the job didn't finish in time).
 */
export async function pollJob<T>(
    fetchJob: () => Promise<T | null>,
    getStatus: (result: T) => JobStatus,
    timeoutMs: number
): Promise<{ result: T | null; status: JobStatus | "timeout" }> {
    const deadline = Date.now() + timeoutMs;
    let delay = FIRST_DELAY_MS;
    let result: T | null = null;
    let status: JobStatus = "pending";

    while (status === "pending" || status === "running") {
        if (Date.now() + delay > deadline) {
            return { result, status: "timeout" };
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * BACKOFF, MAX_DELAY_MS);

        const response = await fetchJob();
        if (response) {
            result = response;
            status = getStatus(response);
        }
    }

    return { result, status };
}
