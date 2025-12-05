import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { Button, FormControl, Modal, Spinner } from "react-bootstrap";
import codeRequiresInput from "../InputReg";

interface CompileOutputProps {
    source: string;
    language: string;
    tabOpen: boolean;
}

const CompileOutput = ({ source, language, tabOpen }: CompileOutputProps) => {
    const { sendJsonRequest } = useApi();

    const [stdinVisible, setStdinVisible] = useState(false);
    const stdinRef = useRef<HTMLTextAreaElement>(null);
    const [stdinValue, setStdinValue] = useState("");

    const [loading, setLoading] = useState(false);
    const [stdout, setStdout] = useState<string | null>(null);
    const [stderr, setStderr] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const inpReq = codeRequiresInput(source, language);
        if(inpReq) setStdinVisible(tabOpen);

        if(tabOpen) {
            setTimeout(() => {
                if(stdinRef.current) {
                    stdinRef.current.focus();
                }
            }, 50);

            if(!inpReq) handleRunCode();
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

        const createJobResult = await sendJsonRequest("/Codes/CreateJob", "POST", {
            source,
            language,
            stdin: stdinValue
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
                getJobResult = await sendJsonRequest("/Codes/GetJob", "POST", { jobId: createJobResult.jobId });
                if (getJobResult && getJobResult.job) {
                    status = getJobResult.job.status;
                }
            }

            if (status === "done") {
                setStdout(getJobResult.job.stdout || "");
                setStderr(getJobResult.job.stderr || "");
            } else {
                setError("Something went wrong.");
            }
        } else {
            setError(createJobResult?.error[0].message ?? "Something went wrong");
            setLoading(false);
        }
        setLoading(false);
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
                backdropClassName="wb-stdin-modal__backdrop"
                data-bs-theme="dark"
                style={{ zIndex: "1060" }}
            >
                <Modal.Header>
                        <Modal.Title>Input</Modal.Title>
                </Modal.Header>
                <Modal.Body className="overflow-auto">
                    <FormControl
                        tabIndex={1}
                        ref={stdinRef}
                        as="textarea"
                        value={stdinValue}
                        onChange={(e) => setStdinValue(e.target.value)}
                        rows={6}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <div className="d-flex gap-2">
                        <Button tabIndex={2} variant="secondary" onClick={stdinHide}>Cancel</Button>
                        <Button tabIndex={3} variant="primary" onClick={handleRunCode}>Run</Button>
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
