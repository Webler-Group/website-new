import { Button, cx, FormControl, ProgressBar, Spinner } from "../../../components/ui";
import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { FaCheck, FaTimes } from "react-icons/fa";
import { ChallengeDetails, ChallengeJobDetails, ChallengeSubmissionDetails, ChallengeTestCase, ChallengeTestResult, ChallengeTestVerdict, CreateChallengeJobData, GetChallengeJobData } from "../types";
import { pollJob } from "../../../utils/pollJob";
import { useXpReward } from "../../../context/xpRewardContext";
import { CreateJobData, GetJobData, JobDetails } from "../../codes/types";

// How long one step may take before we give up: waiting in the queue, compiling, or one test
// (up to 10 s plus container start and the backend's kill allowance). It starts over whenever the
// job makes progress, so a stopped code runner is noticed after this long, however many tests there are.
const STEP_TIMEOUT_MS = 30_000;
// A single run with custom input, as in the playground
const CUSTOM_RUN_TIMEOUT_MS = 30_000;

interface ChallengeCodeOutputProps {
    source: string;
    language: string;
    challenge: ChallengeDetails;
    submission?: ChallengeSubmissionDetails;
}

const ChallengeCodeOutput = ({ source, language, challenge, submission }: ChallengeCodeOutputProps) => {
    const { sendJsonRequest } = useApi();
    const { showXpReward } = useXpReward();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastSubmission, setLastSubmission] = useState(submission ?? null);
    // State of the test run in progress, shown while loading
    const [testJob, setTestJob] = useState<Pick<ChallengeJobDetails, "status" | "progress"> | null>(null);
    // "tests" runs the challenge's test cases, "custom" runs the code once with the user's own input
    const [mode, setMode] = useState<"tests" | "custom">("tests");
    // Starts with the first visible test case's input as an example
    const [stdin, setStdin] = useState(() => challenge.testCases.find(x => !x.isHidden)?.input ?? "");
    const [customRun, setCustomRun] = useState<Pick<JobDetails, "stdout" | "stderr" | "image" | "time" | "memory"> | null>(null);

    useEffect(() => {
        setLastSubmission(submission ?? null);
    }, [submission]);

    const handleRunCustom = async () => {
        setLoading(true);
        setError("");
        setCustomRun(null);
        const createJobResult = await sendJsonRequest<CreateJobData>("/Codes/CreateJob", "POST", {
            source,
            language,
            stdin
        });

        if (createJobResult.data) {
            const jobId = createJobResult.data.jobId;
            const { result, status } = await pollJob(
                async () => (await sendJsonRequest<GetJobData>("/Codes/GetJob", "POST", { jobId })).data ?? null,
                data => data.job.status,
                CUSTOM_RUN_TIMEOUT_MS
            );

            if (status === "done" && result) {
                setCustomRun(result.job);
            } else if (status === "timeout") {
                setError("The code runner is taking too long, please try again in a moment.");
            } else {
                setError("Something went wrong");
            }
        } else {
            setError(createJobResult.error?.[0].message ?? "Something went wrong");
        }
        setLoading(false);
    };

    const handleRunTests = async () => {
        setMode("tests");
        setLoading(true);
        setError("");
        setTestJob({ status: "pending", progress: null });
        const createJobResult = await sendJsonRequest<CreateChallengeJobData>("/Challenge/CreateChallengeJob", "POST", {
            source,
            language,
            challengeId: challenge.id
        });

        if (createJobResult.data) {
            const jobId = createJobResult.data.jobId;
            const { result: getJobResult, status } = await pollJob(
                async () => (await sendJsonRequest<GetChallengeJobData>("/Challenge/GetChallengeJob", "POST", { jobId })).data ?? null,
                data => data.job.status,
                STEP_TIMEOUT_MS,
                {
                    onUpdate: data => setTestJob({ status: data.job.status, progress: data.job.progress }),
                    getProgressKey: data => {
                        const p = data.job.progress;
                        return `${data.job.status}:${p?.stage ?? ""}:${p?.stage === "running" ? p.completed : ""}`;
                    }
                }
            );

            if (status === "error") {
                setError("Something went wrong");
            } else if (status === "done") {
                setLastSubmission(getJobResult?.job.submission ?? null);
                showXpReward(getJobResult?.job.xpAwarded);
            } else if (!getJobResult || getJobResult.job.status === "pending") {
                setError("The code runner is not responding right now, please try again in a moment.");
                setLastSubmission(null);
            } else {
                setError("A test is taking too long, please try again.");
                setLastSubmission(null);
            }
        } else {
            setError(createJobResult.error?.[0].message ?? "Something went wrong");
            setLastSubmission(null);
        }
        setLoading(false);
    };


    const renderCodeBlock = (content?: string) => {
        const text = content ?? "";
        const lines = text.split("\n");
        const lineElements = lines.map((line, i) => (
            <div key={i}>
                <span className="text-secondary">→ </span>
                {line || " "}
            </div>
        ));

        return <div className="wb-challenges-output-code-block">{lineElements}</div>;
    };

    // One row per test of the submission. Results saved before the test cases were copied into them
    // are paired with the challenge's current test cases by position.
    const rows: TestRow[] = !lastSubmission ? [] :
        lastSubmission.testResults.length > 0 && lastSubmission.testResults[0].isHidden !== undefined
            ? lastSubmission.testResults.map(result => ({
                testCase: { isHidden: result.isHidden!, input: result.input, expectedOutput: result.expectedOutput },
                result: result.verdict === "notRun" ? null : result
            }))
            : challenge.testCases.map((testCase, index) => ({
                testCase,
                result: lastSubmission.testResults[index] ?? null
            }));
    // Older submissions didn't store the limit; the challenge had none before them either
    const timeLimit = lastSubmission?.timeLimit;

    return (
        <div className="h-100 p-3 bg-dark text-light overflow-y-scroll">
            <div className="d-flex flex-wrap align-items-center gap-2">
                <Button onClick={handleRunTests} disabled={loading}>Run tests</Button>
                <Button
                    variant={mode === "custom" ? "light" : "outline-light"}
                    onClick={() => { setMode("custom"); setError(""); }}
                    disabled={loading}
                    title="Run the code once with your own input, like in the code playground"
                >
                    Run with input
                </Button>
                {loading && <Spinner animation="border" className="ms-2" />}
            </div>
            {loading && testJob && <TestProgress job={testJob} testCount={challenge.testCases.length} />}
            {error && <div className="text-danger mt-3">{error}</div>}

            {mode === "custom" && (
                <div className="mt-3">
                    <h4>Custom Input</h4>
                    <FormControl
                        as="textarea"
                        rows={5}
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        placeholder="Input for your program (stdin)"
                        className="font-monospace"
                    />
                    <Button className="mt-2" onClick={handleRunCustom} disabled={loading}>Run</Button>

                    {customRun && !loading && (
                        <div className="mt-3">
                            <ResourceUsage result={{ passed: true, time: customRun.time, memory: customRun.memory }} />
                            {customRun.image && (
                                <figure className="mt-2 mb-0">
                                    <div>Image:</div>
                                    <img
                                        src={`data:image/png;base64,${customRun.image.data}`}
                                        alt={customRun.image.name}
                                        width={customRun.image.width}
                                        height={customRun.image.height}
                                        className="wb-compiler-playground-output-image bg-secondary rounded d-block"
                                    />
                                    <figcaption className="small text-secondary mt-1">
                                        output/{customRun.image.name} ({customRun.image.width}x{customRun.image.height})
                                    </figcaption>
                                </figure>
                            )}
                            <div>Output:</div>
                            {renderCodeBlock(customRun.stdout)}
                            {customRun.stderr && customRun.stderr.trim() !== "" && (
                                <div className="text-warning mt-2">
                                    <strong>Stderr:</strong>
                                    {renderCodeBlock(customRun.stderr)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {(mode === "tests" && lastSubmission && !loading) && (
                <div className="mt-3">
                    <h4>Test Results</h4>
                    {timeLimit ? (
                        <div className="small text-secondary mb-2">
                            Time limit per test: {formatTime(timeLimit / 1000)} of CPU time
                        </div>
                    ) : null}
                    {rows.map(({ testCase, result }, index) => {
                        const passed = result?.passed ?? false;
                        const color = result ? (passed ? "success" : "danger") : "warning";
                        const icon = result
                            ? passed
                                ? <FaCheck className="text-success" />
                                : <FaTimes className="text-danger" />
                            : <FaTimes className="text-warning" />;

                        return (
                            <div key={index} className={`p-2 mb-2 rounded border border-${color}`}>
                                <h5 className={`text-${color}`}>
                                    Test {index + 1}: {verdictLabel(result)} {icon}
                                </h5>

                                {result && result.verdict !== "compileError" && (
                                    <ResourceUsage result={result} timeLimit={timeLimit} />
                                )}

                                {testCase.isHidden ? (
                                    <>
                                        <div className="text-muted fst-italic">Hidden test case</div>
                                        {/* Compile errors say nothing about the test, so show them anyway */}
                                        {result?.verdict === "compileError" && result.stderr && (
                                            <div className="text-warning mt-2">
                                                <strong>Stderr:</strong>
                                                {renderCodeBlock(result.stderr)}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div>Input:</div>
                                        {renderCodeBlock(testCase.input)}

                                        <div>Expected Output:</div>
                                        {renderCodeBlock(testCase.expectedOutput)}

                                        {result ? (
                                            <>
                                                <div>Output:</div>
                                                {renderCodeBlock(result.output)}

                                                {result.stderr && result.stderr.trim() !== "" && (
                                                    <div className="text-warning mt-2">
                                                        <strong>Stderr:</strong>
                                                        {renderCodeBlock(result.stderr)}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-warning fst-italic mt-2">
                                                Test case did not run
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/** Where a test run is: in the queue, compiling, or how many tests have finished */
const TestProgress = ({ job, testCount }: { job: Pick<ChallengeJobDetails, "status" | "progress">; testCount: number }) => {
    const progress = job.progress;
    if (job.status === "pending" || !progress) {
        return <div className="small text-secondary mt-2">Waiting for the code runner...</div>;
    }
    if (progress.stage === "compiling") {
        return <div className="small text-secondary mt-2">Compiling...</div>;
    }
    const total = progress.total || testCount;
    return (
        <div className="mt-2 wb-challenges-test-progress">
            <div className="small text-secondary">Running tests: {progress.completed} / {total} done</div>
            <ProgressBar now={total > 0 ? (progress.completed / total) * 100 : 0} variant="success" className="wb-challenges-usage-bar" />
        </div>
    );
};

interface TestRow {
    testCase: Pick<ChallengeTestCase, "isHidden" | "input" | "expectedOutput">;
    result: ChallengeTestResult | null;
}

const VERDICT_LABELS: Record<ChallengeTestVerdict, string> = {
    accepted: "Passed",
    wrongAnswer: "Wrong answer",
    timeLimitExceeded: "Time limit exceeded",
    memoryLimitExceeded: "Memory limit exceeded",
    outputLimitExceeded: "Output limit exceeded",
    runtimeError: "Runtime error",
    compileError: "Compilation error",
    notRun: "Did not run"
};

const verdictLabel = (result: ChallengeTestResult | null) => {
    if (!result) return VERDICT_LABELS.notRun;
    if (result.verdict) return VERDICT_LABELS[result.verdict];
    return result.passed ? "Passed" : "Failed";
};

/** `seconds` of CPU time as "12 ms" or "1.25 s" */
const formatTime = (seconds: number) =>
    seconds < 1 ? `${Math.round(seconds * 1000)} ms` : `${Number(seconds.toFixed(2))} s`;

/** `kb` kilobytes as "820 KB" or "9.4 MB" */
const formatMemory = (kb: number) =>
    kb < 1024 ? `${Math.round(kb)} KB` : `${Number((kb / 1024).toFixed(1))} MB`;

interface ResourceUsageProps {
    result: ChallengeTestResult;
    timeLimit?: number;
}

/** CPU time and peak memory of one test; time is compared with the challenge's limit when it has one */
const ResourceUsage = ({ result, timeLimit }: ResourceUsageProps) => {
    const metrics = [
        {
            label: "Time",
            used: result.time,
            limit: timeLimit ? timeLimit / 1000 : undefined,
            exceeded: result.verdict === "timeLimitExceeded",
            format: formatTime
        },
        {
            label: "Memory",
            used: result.memory,
            // Only the code runner's container limit applies, reached when the program runs out of memory
            limit: undefined,
            exceeded: result.verdict === "memoryLimitExceeded",
            format: formatMemory
        }
    ];

    return (
        <div className="wb-challenges-usage mb-2">
            {metrics.map(m => {
                // A program stopped for running too long has no measurement
                const value = m.used !== undefined
                    ? m.format(m.used)
                    : m.exceeded && m.limit !== undefined ? `> ${m.format(m.limit)}` : "–";
                const ratio = m.limit !== undefined
                    ? m.used !== undefined ? m.used / m.limit : m.exceeded ? 1 : 0
                    : undefined;
                return (
                    <div key={m.label} className="wb-challenges-usage-item">
                        <div className="small">
                            <span className="text-secondary">{m.label}: </span>
                            <span className={cx(m.exceeded && "text-danger fw-semibold")}>{value}</span>
                            {m.limit !== undefined && <span className="text-secondary"> / {m.format(m.limit)}</span>}
                        </div>
                        {ratio !== undefined && (
                            <ProgressBar
                                now={Math.min(ratio, 1) * 100}
                                variant={m.exceeded || ratio > 1 ? "danger" : ratio > 0.8 ? "warning" : "success"}
                                className="wb-challenges-usage-bar"
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};


export default ChallengeCodeOutput;
