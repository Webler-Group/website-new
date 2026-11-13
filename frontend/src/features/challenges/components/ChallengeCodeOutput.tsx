import { Button, cx, ProgressBar, Spinner } from "../../../components/ui";
import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { FaCheck, FaTimes } from "react-icons/fa";
import { ChallengeDetails, ChallengeSubmissionDetails, ChallengeTestCase, ChallengeTestResult, ChallengeTestVerdict, CreateChallengeJobData, GetChallengeJobData } from "../types";
import { pollJob } from "../../../utils/pollJob";
import { useXpReward } from "../../../context/xpRewardContext";

// Covers queueing, compiling and every test case using its full time limit
const BASE_TIMEOUT_MS = 30_000;
// Each test may run up to 10 s, plus container start and the backend's kill allowance
const PER_TEST_TIMEOUT_MS = 13_000;

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

    useEffect(() => {
        setLastSubmission(submission ?? null);
    }, [submission]);

    const handleRunTests = async () => {
        setLoading(true);
        setError("");
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
                BASE_TIMEOUT_MS + PER_TEST_TIMEOUT_MS * challenge.testCases.length
            );

            if (status === "error") {
                setError("Something went wrong");
            } else if (status === "done") {
                setLastSubmission(getJobResult?.job.submission ?? null);
                showXpReward(getJobResult?.job.xpAwarded);
            } else {
                setError("Timeout");
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
    // Older submissions didn't store their limits; the challenge has had none before them either
    const timeLimit = lastSubmission?.timeLimit;
    const memoryLimit = lastSubmission?.memoryLimit;

    return (
        <div className="h-100 p-3 bg-dark text-light overflow-y-scroll">
            <Button onClick={handleRunTests} disabled={loading}>Run tests</Button>
            {loading && <Spinner animation="border" className="ms-3" />}
            {error && <div className="text-danger mt-3">{error}</div>}

            {(lastSubmission && !loading) && (
                <div className="mt-3">
                    <h4>Test Results</h4>
                    {(timeLimit || memoryLimit) && (
                        <div className="small text-secondary mb-2">
                            Limits per test:{" "}
                            {[
                                timeLimit && `${formatTime(timeLimit / 1000)} CPU time`,
                                memoryLimit && `${formatMemory(memoryLimit * 1024)} memory`
                            ].filter(Boolean).join(" · ")}
                        </div>
                    )}
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
                                    <ResourceUsage result={result} timeLimit={timeLimit} memoryLimit={memoryLimit} />
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
    memoryLimit?: number;
}

/** CPU time and peak memory of one test, compared with the challenge's limits when it has them */
const ResourceUsage = ({ result, timeLimit, memoryLimit }: ResourceUsageProps) => {
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
            limit: memoryLimit ? memoryLimit * 1024 : undefined,
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
