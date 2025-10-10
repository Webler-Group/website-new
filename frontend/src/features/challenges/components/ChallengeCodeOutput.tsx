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
    const [lastSubmission, setLastSubmission] = useState(submission);

    useEffect(() => {
        setLastSubmission(submission);
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
                if (attempt > 5) {
                    break;
                }
                getJobResult = await sendJsonRequest("/Challenge/GetChallengeJob", "POST", { jobId: createJobResult.jobId });
                if (getJobResult && getJobResult.job) {
                    status = getJobResult.job.status;
                }
            }

            if (status === "error") {
                setError("Something went wrong");
            } else if (status == "done") {
                setLastSubmission(getJobResult.job.submission);
            }
        } else {
            setError(createJobResult?.error[0].message ?? "Something went wrong");
        }
        setLoading(false);
    }

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

                        if (!result) return <></>;

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
                                {
                                    testCase.isHidden ?
                                        <div className="text-muted fst-italic">Hidden test case</div>
                                        :
                                        <>
                                            <div>Input: <pre className="bg-secondary p-2 rounded text-light">{testCase.input}</pre></div>
                                            <div>Expected Output: <pre className="bg-secondary p-2 rounded text-light">{testCase.expectedOutput}</pre></div>
                                            <div>Output: <pre className="bg-secondary p-2 rounded text-light">{result.output}</pre></div>
                                            {result.time && <p>Execution Time: {result.time * 1000} ms</p>}
                                        </>
                                }
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ChallengeCodeOutput;