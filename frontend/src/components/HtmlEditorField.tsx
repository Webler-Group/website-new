import { FormGroup, Modal, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { Dispatch, ReactNode, SetStateAction, useEffect, useId, useRef, useState } from "react";
import FileExplorer from "./file-explorer/FileExplorer";
import HtmlRenderer from "./HtmlRenderer";
import { MDEditorMode } from "./MdEditorField";
import AceEditor from "react-ace";
import ace from "ace-builds";

import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";

ace.config.set("basePath", new URL("ace-builds/src-noconflict", import.meta.url).pathname);

interface HtmlEditorFieldProps {
    text: string;
    setText: Dispatch<SetStateAction<string>>;
    css?: string;
    onCssSave?: (css: string) => void | Promise<void>;
    maxCharacters?: number;
    customPreview?: ReactNode;
    onModeChange?: (mode: MDEditorMode) => void;
    section: string;
    rootAlias: string;
    rows?: number;
    height?: number;
}

const HtmlEditorField = ({
    text,
    setText,
    css,
    onCssSave,
    maxCharacters = 4096,
    customPreview,
    onModeChange,
    section,
    rootAlias,
    rows = 12,
    height
}: HtmlEditorFieldProps) => {
    const [mode, setMode] = useState<MDEditorMode>("write");
    const uid = useId();
    const [showImages, setShowImages] = useState(false);
    const [showCssModal, setShowCssModal] = useState(false);
    const [cssDraft, setCssDraft] = useState("");
    const aceEditorRef = useRef<ace.Ace.Editor | null>(null);
    const editorHeightRef = useRef<number>(height ?? rows * 24);
    const [editorHeight, setEditorHeight] = useState(height ?? rows * 24);

    useEffect(() => {
        onModeChange?.(mode);
    }, [mode]);

    const handleChange = (value: string) => {
        setText(value.slice(0, maxCharacters));
    };

    const insertAtCursor = (html: string) => {
        if (aceEditorRef.current) {
            aceEditorRef.current.session.insert(aceEditorRef.current.getCursorPosition(), html);
        } else {
            handleChange(text + html);
        }
    };

    const openCssModal = () => {
        setCssDraft(css ?? "");
        setShowCssModal(true);
    };

    const saveCss = async () => {
        await onCssSave?.(cssDraft);
        setShowCssModal(false);
    };

    const handleDragStart = (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as Element).setPointerCapture(e.pointerId);
        const startY = e.clientY;
        const startHeight = editorHeightRef.current;

        const handlePointerMove = (e: PointerEvent) => {
            const newHeight = Math.max(100, startHeight + e.clientY - startY);
            editorHeightRef.current = newHeight;
            setEditorHeight(newHeight);
        };

        const handlePointerUp = (e: PointerEvent) => {
            (e.target as Element).releasePointerCapture(e.pointerId);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    };

    const toolbarButtons = [
        { icon: "img", action: () => setShowImages(true) },
        { icon: "css", action: openCssModal }
    ];

    return (
        <div>
            <FileExplorer
                title="Image Select"
                section={section}
                rootAlias={rootAlias}
                show={showImages}
                onHide={() => setShowImages(false)}
                onSelect={(url, alt) => {
                    const html = `<img src="${url}" alt="${alt || "image"}" />`;
                    insertAtCursor(html);
                }}
            />

            <Modal show={showCssModal} onHide={() => setShowCssModal(false)} size="lg" fullscreen>
                <Modal.Header closeButton>
                    <Modal.Title>Custom CSS</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <AceEditor
                        mode="css"
                        theme="tomorrow_night"
                        value={cssDraft}
                        onChange={setCssDraft}
                        width="100%"
                        height="100%"
                        fontSize={16}
                        showGutter
                        showPrintMargin={false}
                        setOptions={{ useWorker: false, tabSize: 2 }}
                        editorProps={{ $blockScrolling: true }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-secondary" onClick={() => setShowCssModal(false)}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={saveCss}>
                        Save
                    </button>
                </Modal.Footer>
            </Modal>

            <div className="d-flex overflow-auto mb-2 p-2 bg-light rounded border gap-2">
                {toolbarButtons.map((btn, idx) => (
                    <button
                        key={idx}
                        className="btn btn-sm btn-outline-secondary flex-shrink-0"
                        onClick={(e) => {
                            e.preventDefault();
                            btn.action();
                        }}
                        style={{ minWidth: "40px" }}
                    >
                        {btn.icon}
                    </button>
                ))}
            </div>

            <div className="mb-2">
                <ToggleButtonGroup
                    type="radio"
                    name={`${uid}-editorMode`}
                    value={mode}
                    onChange={setMode}
                >
                    <ToggleButton id={`${uid}-write-btn`} value="write" variant="outline-primary" size="sm">
                        Write
                    </ToggleButton>
                    <ToggleButton id={`${uid}-preview-btn`} value="preview" variant="outline-primary" size="sm">
                        Preview
                    </ToggleButton>
                </ToggleButtonGroup>
            </div>

            {mode === "write" && (
                <FormGroup>
                    <AceEditor
                        mode="html"
                        theme="tomorrow_night"
                        value={text}
                        onChange={handleChange}
                        onLoad={(editor) => {
                            aceEditorRef.current = editor;
                        }}
                        width="100%"
                        height={`${editorHeight}px`}
                        fontSize={16}
                        showGutter
                        showPrintMargin={false}
                        setOptions={{ useWorker: false, tabSize: 2 }}
                        editorProps={{ $blockScrolling: true }}
                    />
                    <div
                        onPointerDown={handleDragStart}
                        style={{
                            height: "10px",
                            cursor: "ns-resize",
                            background: "#343a40",
                            borderRadius: "0 0 4px 4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            userSelect: "none"
                        }}
                    >
                        <svg width="24" height="4" viewBox="0 0 24 4" fill="#6c757d">
                            <rect y="0" width="24" height="1.5" rx="1" />
                            <rect y="2.5" width="24" height="1.5" rx="1" />
                        </svg>
                    </div>
                </FormGroup>
            )}

            {mode === "preview" &&
                (customPreview != null ? (
                    customPreview
                ) : (
                    <div style={editorHeightRef.current ? { minHeight: editorHeightRef.current } : undefined}>
                        <HtmlRenderer html={text} css={css} />
                    </div>
                ))}
        </div>
    );
};

export default HtmlEditorField;
