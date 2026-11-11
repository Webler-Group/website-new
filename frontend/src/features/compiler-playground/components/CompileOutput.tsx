import { Button, FormControl, Modal, Spinner } from "../../../components/ui";
import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import codeRequiresInput from "../../../utils/InputReg";
import { CreateJobData, GetJobData, JobImage } from "../../codes/types";
import { pollJob } from "../../../utils/pollJob";

// Covers queueing, compiling and the run itself
const RUN_TIMEOUT_MS = 30_000;

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
    const [image, setImage] = useState<JobImage | null>(null);
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
        setImage(null);
        setError(null);

        const createJobResult = await sendJsonRequest<CreateJobData>("/Codes/CreateJob", "POST", {
            source,
            language,
            stdin: stdinValue
        });

        if (createJobResult.data) {
            const jobId = createJobResult.data.jobId;
            const { result, status } = await pollJob(
                async () => (await sendJsonRequest<GetJobData>("/Codes/GetJob", "POST", { jobId })).data ?? null,
                data => data.job.status,
                RUN_TIMEOUT_MS
            );

            if (status === "done" && result) {
                setStdout(result.job.stdout || "");
                setStderr(result.job.stderr || "");
                setImage(result.job.image ?? null);
            } else if (status === "timeout") {
                setError("The code runner is taking too long, please try again in a moment.");
            } else {
                setError("Something went wrong.");
            }
        } else {
            setError(createJobResult.error?.[0].message ?? "Something went wrong");
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
                contentClassName="bg-dark text-light"
                data-bs-theme="dark"
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
                {image && (
                    <figure className="mt-3 mb-0">
                        <h5>Image:</h5>
                        <img
                            src={`data:image/png;base64,${image.data}`}
                            alt={image.name}
                            width={image.width}
                            height={image.height}
                            className="wb-compiler-playground-output-image bg-secondary rounded d-block"
                        />
                        <figcaption className="small text-secondary mt-1">
                            output/{image.name} ({image.width}x{image.height})
                        </figcaption>
                    </figure>
                )}
                {stdout && (
                    <div className="wb-compiler-playground-output-stdout mt-3 overflow-y-scroll">
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
