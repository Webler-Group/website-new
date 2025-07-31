import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { Button, FormControl, Modal, Spinner } from "react-bootstrap";
import { useWS } from "../../../context/wsCommunication";

interface CompileOutputProps {
    source: string;
    language: string;
    tabOpen: boolean;
}

const CompileOutput = ({ source, language, tabOpen }: CompileOutputProps) => {
    const { sendJsonRequest } = useApi();
    const { socket } = useWS();

    const [stdinVisible, setStdinVisible] = useState(false);
    const stdinRef = useRef<HTMLDivElement>(null);
    const [stdinValue, setStdinValue] = useState("");

    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [stdout, setStdout] = useState<string | null>(null);
    const [stderr, setStderr] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (tabOpen) {
            setStdinVisible(true);
        }
    }, [tabOpen]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setLoading(false);
        }, 10000);

        return () => clearTimeout(timeoutId);
    }, [currentJobId]);

    useEffect(() => {
        if (!socket) return;

        const handleGetJob = (payload: any) => {
            if (payload.job) {
                if (payload.job.status === "done") {
                    setStdout(payload.job.stdout || "");
                    setStderr(payload.job.stderr || "");
                } else {
                    setError("Something went wrong.");
                }
            } else {
                setError("Something went wrong.");
            }
            setLoading(false);
        };

        socket.on("job:get", handleGetJob);

        return () => {
            socket.off("job:get", handleGetJob);
        };
    }, [socket]);

    const stdinHide = () => {
        setStdinVisible(false);
    };

    const handleRunCode = async () => {
        stdinHide();
        setLoading(true);
        setStdout(null);
        setStderr(null);
        setError(null);

        const createJobResult = await sendJsonRequest("/Codes/CreateJob", "POST", {
            source,
            language,
            stdin: stdinValue
        });

        if (createJobResult && createJobResult.jobId) {
            setCurrentJobId(createJobResult.jobId);
        } else {
            setError(createJobResult.message ?? "Something went wrong");
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
                    <div className="d-flex gap-2">
                        <Button variant="secondary" onClick={stdinHide}>Cancel</Button>
                        <Button variant="primary" onClick={handleRunCode}>Run</Button>
                    </div>
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
