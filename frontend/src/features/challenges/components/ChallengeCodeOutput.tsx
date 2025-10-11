import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { IChallenge, IChallengeSubmission } from "../types";
import { Button, Spinner } from "react-bootstrap";
import { FaCheck, FaTimes } from "react-icons/fa";

interface ChallengeCodeOutputProps {
    source: string;
    language: string;
    challenge: IChallenge;
    submission?: IChallengeSubmission;
}

const ChallengeCodeOutput = ({ source, language, challenge, submission }: ChallengeCodeOutputProps) => {
    const { sendJsonRequest } = useApi();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastSubmission, setLastSubmission] = useState(submission ?? null);

    useEffect(() => {
        setLastSubmission(submission ?? null);
    }, [submission]);

    const handleRunTests = async () => {
        setLoading(true);
        setError("");
        const createJobResult = await sendJsonRequest("/Challenge/CreateChallengeJob", "POST", {
            source,
            language,
            challengeId: challenge.id
        });

        if (createJobResult && createJobResult.jobId) {
            let getJobResult = null;
            let status = "pending";
            let attempt = 0;

            while (status === "pending" || status === "running") {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                ++attempt;
                if (attempt > challenge.testCases.length + 4) break;

                getJobResult = await sendJsonRequest("/Challenge/GetChallengeJob", "POST", { jobId: createJobResult.jobId });
                if (getJobResult && getJobResult.job) {
                    status = getJobResult.job.status;
                }
            }

            if (status === "error") {
                setError("Something went wrong");
            } else if (status === "done") {
                setLastSubmission(getJobResult.job.submission);
            } else {
                setError("Timeout");
                setLastSubmission(null);
            }
        } else {
            setError(createJobResult?.error?.[0]?.message ?? "Something went wrong");
            setLastSubmission(null);
        }
        setLoading(false);
    };

    const codeBlockStyle: React.CSSProperties = {
        backgroundColor: "#343a40",
        color: "#f8f9fa",
        borderRadius: "0.25rem",
        padding: "0.5rem",
        whiteSpace: "pre",
        overflowX: "auto",
        overflowY: "auto",
        fontFamily: "monospace",
        fontSize: "0.9rem",
        lineHeight: "1.3em",
        minHeight: "1.5em",
        marginTop: "0.25rem",
        marginBottom: "0.25rem",
    };

    const renderCodeBlock = (content?: string) => {
        const text = content ?? "";
        const lines = text.split("\n");
        const lineElements = lines.map((line, i) => (
            <div key={i}>
                <span style={{ color: "#6c757d" }}>→ </span>
                {line || " "}
            </div>
        ));

        return <div style={codeBlockStyle}>{lineElements}</div>;
    };

    return (
        <div className="h-100 p-3 bg-dark text-light overflow-y-scroll">
            <Button onClick={handleRunTests} disabled={loading}>Run tests</Button>
            {loading && <Spinner animation="border" className="ms-3" />}
            {error && <div className="text-danger mt-3">{error}</div>}

            {(lastSubmission && !loading) && (
                <div className="mt-3">
                    <h4>Test Results</h4>
                    {challenge.testCases.map((testCase, index) => {
                        const result = lastSubmission.testResults[index];
                        if (!result) return null;

                        const passed = result.passed;
                        const icon = passed ? <FaCheck className="text-success" /> : <FaTimes className="text-danger" />;

                        return (
                            <div
                                key={index}
                                className={`p-2 mb-2 rounded border ${passed ? 'border-success' : 'border-danger'}`}
                            >
                                <h5 className={`${passed ? 'text-success' : 'text-danger'}`}>
                                    Test {index + 1}: {passed ? 'Passed' : 'Failed'} {icon}
                                </h5>

                                {testCase.isHidden ? (
                                    <div className="text-muted fst-italic">Hidden test case</div>
                                ) : (
                                    <>
                                        <div>Input:</div>
                                        {renderCodeBlock(testCase.input)}

                                        <div>Expected Output:</div>
                                        {renderCodeBlock(testCase.expectedOutput)}

                                        <div>Output:</div>
                                        {renderCodeBlock(result.output)}

                                        {result.stderr && result.stderr.trim() !== "" && (
                                            <div className="text-warning mt-2">
                                                <strong>Stderr:</strong>
                                                {renderCodeBlock(result.stderr)}
                                            </div>
                                        )}

                                        {result.time && <p>Execution Time: {result.time * 1000} ms</p>}
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


export default ChallengeCodeOutput;
