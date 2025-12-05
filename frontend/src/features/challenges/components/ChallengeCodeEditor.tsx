import { Button, Dropdown, Modal } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";
import { IChallenge } from "../types";
import { compilerLanguages } from "../../../data/compilerLanguages";
import { useEffect, useState } from "react";
import { ICode } from "../../codes/components/Code";
import { useApi } from "../../../context/apiCommunication";
import CodeEditor from "../../compiler-playground/components/CodeEditor";
import useEditorOptions from "../../compiler-playground/hooks/useEditorOptions";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import Loader from "../../../components/Loader";
import { useSnackbar } from "../../../context/SnackbarProvider";

interface ChallengeCodeEditorProps {
    challenge: IChallenge;
    language: compilerLanguages | null;
    onExit: () => void;
}

const ChallengeCodeEditor = ({ challenge, language, onExit }: ChallengeCodeEditorProps) => {
    const { sendJsonRequest } = useApi();
    const [code, setCode] = useState<ICode | null>(null);
    const [source, setSource] = useState("");
    const [js, setJs] = useState("");
    const [css, setCss] = useState("");
    const [loading, setLoading] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const { editorOptions } = useEditorOptions();
    const { showMessage } = useSnackbar();
    const [title, setTitle] = useState(challenge.title);

    useEffect(() => {
        if (!language) return;
        setTitle(`${challenge.title}`);
        getCode();
    }, [challenge.id, language]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.userAgent.includes('Mac');
            const isSaveShortcut = (isMac && e.metaKey && e.key === 's') || (!isMac && e.ctrlKey && e.key === 's');

            if (isSaveShortcut) {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [code, source, css, js]);

    const getCode = async () => {
        setLoading(true);

        const result = await sendJsonRequest("/Challenge/GetChallengeCode", "POST", {
            challengeId: challenge.id,
            language
        });
        if (result && result.code) {
            setCode(result.code);
            setSource(result.code.source);
        }

        setLoading(false);
    }

    const handleSave = async () => {
        setLoading(true);

        const result = await sendJsonRequest("/Challenge/SaveChallengeCode", "POST", {
            challengeId: challenge.id,
            language,
            source,
            title
        });
        if (result && result.data) {
            setCode(prev => ({ ...prev, ...result.data }));
            setSource(result.data.source);

            showMessage("Code saved successfully");
        } else {
            showMessage("Code failed to save");
        }

        setLoading(false);
    }

    const handleExit = () => {
        if (source != code?.source) {
            setShowExitModal(true);
        } else {
            onExit();
        }
    }

    const confirmExit = () => {
        setShowExitModal(false);
        onExit();
    };

    const saveAndExit = async () => {
        await handleSave();
        confirmExit();
    };

    return (
        <>
            <Modal style={{ zIndex: "1060" }} backdropClassName="wb-challenges-editor__exit-modal__backdrop" show={showExitModal} onHide={() => setShowExitModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Unsaved Changes</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    You have unsaved changes. Do you want to save before exiting?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={confirmExit}>
                        Exit Without Saving
                    </Button>
                    <Button variant="primary" onClick={saveAndExit}>
                        Save and Exit
                    </Button>
                </Modal.Footer>
            </Modal>
            <Modal
                show={language !== null}
                onHide={handleExit}
                fullscreen
                className="p-0 m-0"
                contentClassName="h-100"
            >
                <Modal.Body className="p-0 m-0 d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-between border-bottom bg-white p-1" style={{ height: "44px" }}>
                        <div className="d-flex align-items-center">
                            <Button variant="link" className="text-secondary" onClick={handleExit}>
                                <FaTimes />
                            </Button>
                            <h5 className="mb-0">{challenge.title}</h5>
                        </div>
                        <div>
                            <Dropdown>
                                <Dropdown.Toggle as={EllipsisDropdownToggle}></Dropdown.Toggle>
                                <Dropdown.Menu style={{ width: "200px" }}>
                                    <Dropdown.Item onClick={handleSave}>Save</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>
                    <div className="d-flex flex-column flex-grow-1 overflow-hidden">
                        {
                            code != null ?
                                <CodeEditor
                                    code={code}
                                    source={source}
                                    setSource={setSource}
                                    css={css}
                                    setCss={setCss}
                                    js={js}
                                    setJs={setJs}
                                    options={editorOptions}
                                    tabHeightStyle="calc(100dvh - 85px)"
                                    challenge={challenge}
                                    submission={code.lastSubmission}
                                />
                                :
                                loading ?
                                    <div className="d-flex w-100 h-100 justify-content-center align-items-center">
                                        <Loader />
                                    </div>
                                    :
                                    <p>Something went wrong</p>
                        }
                    </div>
                </Modal.Body>
            </Modal >
        </>
    );
}

export default ChallengeCodeEditor;