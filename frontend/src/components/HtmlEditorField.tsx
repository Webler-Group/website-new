import { FormGroup, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from "react";
import FileExplorer from "./file-explorer/FileExplorer";
import HtmlRenderer from "./HtmlRenderer";
import { MDEditorMode } from "./MdEditorField";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/mode-html";

interface HtmlEditorFieldProps {
    text: string;
    setText: Dispatch<SetStateAction<string>>;
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

    useEffect(() => {
        onModeChange?.(mode);
    }, [mode]);

    const handleChange = (value: string) => {
        const limitedValue = value.slice(0, maxCharacters);
        setText(limitedValue);
    };

    const toolbarButtons = [
        { icon: "img", className: undefined, action: () => setShowImages(true) }
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

            <div className="d-flex overflow-auto mb-2 p-2 bg-light rounded border gap-2">
                {toolbarButtons.map((btn, idx) => (
                    <button
                        key={idx}
                        className={
                            "btn btn-sm btn-outline-secondary flex-shrink-0" +
                            (btn.className ? " " + btn.className : "")
                        }
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
                    onChange={(val: any) => setMode(val)}
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
                        onChange={(v) => handleChange(v)}
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
                        <HtmlRenderer html={text} />
                    </div>
                ))}
        </div>
    );
};

export default HtmlEditorField;
