import { FormGroup, Modal, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from "react";
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
    const [showImages, setShowImages] = useState(false);
    const [showCssModal, setShowCssModal] = useState(false);
    const [cssDraft, setCssDraft] = useState("");

    useEffect(() => {
        onModeChange?.(mode);
    }, [mode]);

    const handleChange = (value: string) => {
        setText(value.slice(0, maxCharacters));
    };

    const openCssModal = () => {
        setCssDraft(css ?? "");
        setShowCssModal(true);
    };

    const saveCss = async () => {
        await onCssSave?.(cssDraft);
        setShowCssModal(false);
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
                    handleChange(text + html);
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

            <div className="mb-3">
                <ToggleButtonGroup
                    type="radio"
                    name="editorMode"
                    value={mode}
                    onChange={setMode}
                >
                    <ToggleButton id="write-btn" value="write" variant="outline-primary">
                        Write
                    </ToggleButton>
                    <ToggleButton id="preview-btn" value="preview" variant="outline-primary">
                        Preview
                    </ToggleButton>
                </ToggleButtonGroup>
            </div>

            {mode === "write" && (
                <FormGroup className="mb-3">
                    <AceEditor
                        mode="html"
                        theme="tomorrow_night"
                        value={text}
                        onChange={handleChange}
                        width="100%"
                        height={height ? `${height}px` : undefined}
                        minLines={height ? undefined : rows}
                        maxLines={height ? undefined : rows}
                        fontSize={16}
                        showGutter
                        showPrintMargin={false}
                        setOptions={{
                            useWorker: false,
                            tabSize: 2
                        }}
                        editorProps={{ $blockScrolling: true }}
                    />
                </FormGroup>
            )}

            {mode === "preview" &&
                (customPreview != null ? (
                    customPreview
                ) : (
                    <div className="p-2 border rounded bg-light">
                        <HtmlRenderer html={text} css={css} />
                    </div>
                ))}
        </div>
    );
};

export default HtmlEditorField;
