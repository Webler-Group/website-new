import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { Button, FormControl, Modal, Spinner } from "react-bootstrap";

interface CompileOutputProps {
    source: string;
    language: string;
    tabOpen: boolean;
}

const CompileOutput = ({ source, language, tabOpen }: CompileOutputProps) => {
    const { sendJsonRequest } = useApi();

    const [stdinVisible, setStdinVisible] = useState(false);
    const stdinRef = useRef<HTMLDivElement>(null);
    const [stdinValue, setStdinValue] = useState("");

    const [loading, setLoading] = useState(false);
    const [stdout, setStdout] = useState<string | null>(null);
    const [stderr, setStderr] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (tabOpen) {
            setStdinVisible(true);
        }
    }, [tabOpen]);

    const stdinHide = () => {
        setStdinVisible(false);
    };

    const handleRunCode = async () => {
        stdinHide();
        setLoading(true);
        setStdout(null);
        setStderr(null);
        setError(null);

        try {
            const result = await sendJsonRequest("/Codes/CreateJob", "POST", {
                source,
                language,
                stdin: stdinValue
            });

            const jobId = result?.jobId;

            if (!jobId) {
                throw new Error("Failed to retrieve jobId");
            }

            // Polling for job status
            let status = "pending";
            let jobOutput = null;

            while (status === "pending" || status === "running") {
                const res = await sendJsonRequest("/Codes/GetJob", "POST", { jobId });
                jobOutput = res?.job;

                if (!jobOutput) {
                    throw new Error("Invalid job response");
                }

                status = jobOutput.status;

                if (status === "pending" || status === "running") {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            if (status === "done") {
                setStdout(jobOutput.stdout || "");
                setStderr(jobOutput.stderr || "");
            } else if (status === "error") {
                setError("An error occurred during code execution.");
                setStderr(jobOutput.stderr || "");
            }

        } catch (err: any) {
            setError(err.message || "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal
                show={stdinVisible}
                backdrop="static"
                keyboard={false}
                centered
                fullscreen="sm-down"
                contentClassName="wb-modal__container bg-dark text-light"
                data-bs-theme="dark"
            >
                <Modal.Header>
                    <h2>Stdin</h2>
                </Modal.Header>
                <Modal.Body className="overflow-auto" ref={stdinRef}>
                    <FormControl
                        as="textarea"
                        value={stdinValue}
                        onChange={(e) => setStdinValue(e.target.value)}
                        rows={6}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={handleRunCode}>Run code</Button>
                </Modal.Footer>
            </Modal>

            <div className="h-100 p-3 bg-dark text-light overflow-y-scroll">
                {loading && (
                    <div className="d-flex align-items-center">
                        <Spinner animation="border" variant="light" size="sm" className="me-2" />
                        <span>Running your code...</span>
                    </div>
                )}
                {error && <div className="text-danger mt-2">{error}</div>}
                {stdout && (
                    <div className="mt-3 overflow-y-scroll" style={{ maxHeight: "calc(100vh - 200px)" }}>
                        <h5>Stdout:</h5>
                        <pre className="bg-secondary p-2 rounded">{stdout}</pre>
                    </div>
                )}
                {stderr && (
                    <div className="mt-3">
                        <h5>Stderr:</h5>
                        <pre className="bg-secondary p-2 rounded text-warning">{stderr}</pre>
                    </div>
                )}
            </div>
        </>
    );
};

export default CompileOutput;
