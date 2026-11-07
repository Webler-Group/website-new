import { Button, Dropdown, Modal } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";
import { CSSProperties, useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import CodeEditor from "../../compiler-playground/components/CodeEditor";
import useEditorOptions from "../../compiler-playground/hooks/useEditorOptions";
import useVisualViewport from "../../compiler-playground/hooks/useVisualViewport";
import useUnsavedChangesGuard from "../../compiler-playground/hooks/useUnsavedChangesGuard";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import Loader from "../../../components/Loader";
import { useSnackbar } from "../../../context/SnackbarProvider";
import CompilerLanguagesEnum from "../../../data/CompilerLanguagesEnum";
import { ChallengeCodeDetails, ChallengeDetails, GetChallengeCodeData, SaveChallengeCodeData } from "../types";

interface ChallengeCodeEditorProps {
    challenge: ChallengeDetails;
    language: CompilerLanguagesEnum | null;
    onExit: () => void;
}

const ChallengeCodeEditor = ({ challenge, language, onExit }: ChallengeCodeEditorProps) => {
    const { sendJsonRequest } = useApi();
    const [code, setCode] = useState<ChallengeCodeDetails| null>(null);
    const [source, setSource] = useState("");
    const [js, setJs] = useState("");
    const [css, setCss] = useState("");
    const [loading, setLoading] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const { editorOptions } = useEditorOptions();
    const { viewport } = useVisualViewport();
    const { showMessage } = useSnackbar();
    const [title, setTitle] = useState(challenge.title);

    // Guards tab close / reload and in-app navigation (e.g. browser back) while the editor is open
    const hasUnsavedChanges = language !== null && code !== null && source !== code.source;
    const { blocker } = useUnsavedChangesGuard(hasUnsavedChanges);
    const navigationBlocked = blocker.state === "blocked";

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

        const result = await sendJsonRequest<GetChallengeCodeData>("/Challenge/GetChallengeCode", "POST", {
            challengeId: challenge.id,
            language
        });
        if (result.data) {
            setCode(result.data.code);
            setSource(result.data.code.source);
        }

        setLoading(false);
    }

    /** Returns true when the code was saved */
    const handleSave = async () => {
        if(!code) return false;
        setLoading(true);

        const result = await sendJsonRequest<SaveChallengeCodeData>("/Challenge/SaveChallengeCode", "POST", {
            challengeId: challenge.id,
            language,
            source,
            title
        });
        if (result && result.data) {
            setCode(prev => prev ? { ...prev, ...result.data } : null);
            setSource(result.data.source);

            showMessage("Code saved successfully");
            setLoading(false);
            return true;
        }

        showMessage("Code failed to save");
        setLoading(false);
        return false;
    }

    const handleExit = () => {
        if (source != code?.source) {
            setShowExitModal(true);
        } else {
            onExit();
        }
    }

    const cancelExit = () => {
        setShowExitModal(false);
        if (navigationBlocked) blocker.reset?.();
    };

    const confirmExit = () => {
        setShowExitModal(false);
        if (navigationBlocked) {
            // Leaving the page entirely (browser back / link) - the page navigation closes the editor
            blocker.proceed?.();
        } else {
            onExit();
        }
    };

    const saveAndExit = async () => {
        if (await handleSave()) {
            confirmExit();
        } else {
            cancelExit();
        }
    };

    // Only expose the visible height (excludes the mobile virtual keyboard) to the editor tabs
    const viewportStyle = viewport ? ({ "--wb-viewport-height": `${viewport.height}px` } as CSSProperties) : undefined;

    return (
        <>
            <Modal style={{ zIndex: "1060" }} backdropClassName="wb-challenges-editor__exit-modal__backdrop" show={showExitModal || navigationBlocked} onHide={cancelExit} centered>
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
                <Modal.Body className="p-0 m-0 d-flex flex-column" style={viewportStyle}>
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
                                    tabHeightStyle="calc(var(--wb-viewport-height, 100dvh) - 85px)"
                                    challenge={challenge}
                                    submission={code.challenge.lastSubmission}
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