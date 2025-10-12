import { Button, Dropdown, Modal, Tab, Tabs } from "react-bootstrap";
import { FaTimes, FaGripVertical } from "react-icons/fa";
import { IChallenge } from "../types";
import { compilerLanguages } from "../../../data/compilerLanguages";
import { useEffect, useState, useRef } from "react";
import { ICode } from "../../codes/components/Code";
import { useApi } from "../../../context/apiCommunication";
import CodeEditor from "../../compiler-playground/components/CodeEditor";
import useEditorOptions from "../../compiler-playground/hooks/useEditorOptions";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import Loader from "../../../components/Loader";
import { useSnackbar } from "../../../context/SnackbarProvider";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import LanguageIcons from "./LanguageIcons";

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
    const [leftPanelWidth, setLeftPanelWidth] = useState(40); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState("description");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;
            
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            
            // Constrain between 20% and 80%
            if (newWidth >= 20 && newWidth <= 80) {
                setLeftPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

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

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const renderDescriptionPanel = () => (
        <div className="p-3">
            <div className="mb-3">
                <span
                    className={`badge ${
                        challenge.difficulty === "easy"
                            ? "bg-success"
                            : challenge.difficulty === "medium"
                            ? "bg-warning text-dark"
                            : "bg-danger"
                    }`}
                >
                    {challenge.difficulty}
                </span>
            </div>
            
            <div className="mb-3">
                <MarkdownRenderer content={challenge.description} />
            </div>

            <div className="mt-3">
                <LanguageIcons challenge={challenge} />
            </div>
        </div>
    );

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
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between border-bottom bg-white p-1" style={{ height: "44px" }}>
                        <div className="d-flex align-items-center">
                            <Button variant="link" className="text-secondary" onClick={handleExit}>
                                <FaTimes />
                            </Button>
                            <h5 className="mb-0">{challenge.title}</h5>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Dropdown>
                                <Dropdown.Toggle as={EllipsisDropdownToggle}></Dropdown.Toggle>
                                <Dropdown.Menu style={{ width: "200px" }}>
                                    <Dropdown.Item onClick={handleSave}>Save</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>

                    {/* Content Area */}
                    {isMobile ? (
                        // Mobile: Tabbed Layout
                        <div className="flex-grow-1 overflow-hidden bg-dark" data-bs-theme="dark">
                            <Tabs 
                                activeKey={activeTab} 
                                onSelect={(k) => setActiveTab(k || "description")} 
                                fill 
                                justify
                            >
                                <Tab 
                                    eventKey="description" 
                                    title="Description"
                                    className="bg-white"
                                    style={{ height: "calc(100dvh - 85px)" }}
                                >
                                    <div className="overflow-y-auto h-100">
                                        {renderDescriptionPanel()}
                                    </div>
                                </Tab>
                                <Tab 
                                    eventKey="editor" 
                                    title="Editor"
                                    style={{ height: "calc(100dvh - 85px)" }}
                                >
                                    {code != null ? (
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
                                            hideChallengeDescription={true}
                                            hideOutputTab={true}
                                        />
                                    ) : loading ? (
                                        <div className="d-flex w-100 h-100 justify-content-center align-items-center">
                                            <Loader />
                                        </div>
                                    ) : (
                                        <p className="p-3 text-white">Something went wrong</p>
                                    )}
                                </Tab>
                                <Tab 
                                    eventKey="output" 
                                    title="Output"
                                    style={{ height: "calc(100dvh - 85px)" }}
                                >
                                    {code != null ? (
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
                                            hideChallengeDescription={true}
                                            showOnlyOutput={true}
                                        />
                                    ) : (
                                        <div className="d-flex w-100 h-100 justify-content-center align-items-center">
                                            <Loader />
                                        </div>
                                    )}
                                </Tab>
                            </Tabs>
                        </div>
                    ) : (
                        // Desktop: Split Layout
                        <div ref={containerRef} className="d-flex flex-grow-1 overflow-hidden position-relative">
                            {/* Left Panel - Description */}
                            <div 
                                className="border-end bg-white overflow-auto"
                                style={{ 
                                    width: `${leftPanelWidth}%`,
                                    minWidth: "200px"
                                }}
                            >
                                {renderDescriptionPanel()}
                            </div>

                            {/* Resizer */}
                            <div
                                onMouseDown={handleMouseDown}
                                className="d-flex align-items-center justify-content-center"
                                style={{
                                    width: "8px",
                                    cursor: "col-resize",
                                    backgroundColor: "#e9ecef",
                                    position: "relative",
                                    flexShrink: 0,
                                    userSelect: "none"
                                }}
                            >
                                <FaGripVertical 
                                    className="text-muted" 
                                    style={{ 
                                        fontSize: "12px",
                                        pointerEvents: "none"
                                    }} 
                                />
                            </div>

                            {/* Right Panel - Code Editor */}
                            <div 
                                className="overflow-hidden"
                                style={{ 
                                    width: `${100 - leftPanelWidth}%`,
                                    minWidth: "200px"
                                }}
                            >
                                {code != null ? (
                                    <CodeEditor
                                        code={code}
                                        source={source}
                                        setSource={setSource}
                                        css={css}
                                        setCss={setCss}
                                        js={js}
                                        setJs={setJs}
                                        options={editorOptions}
                                        tabHeightStyle="calc(100dvh - 44px)"
                                        challenge={challenge}
                                        submission={code.lastSubmission}
                                        hideChallengeDescription={true}
                                    />
                                ) : loading ? (
                                    <div className="d-flex w-100 h-100 justify-content-center align-items-center">
                                        <Loader />
                                    </div>
                                ) : (
                                    <p className="p-3">Something went wrong</p>
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
}

export default ChallengeCodeEditor;