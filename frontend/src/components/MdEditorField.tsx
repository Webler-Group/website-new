import { Button, FormControl, FormGroup, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { Dispatch, ReactNode, SetStateAction, useEffect, useId, useRef, useState } from "react";
import PostTextareaControl from "./PostTextareaControl";
import PostAttachmentSelect from "./post-attachment-select/PostAttachmentSelect";
import MarkdownRenderer from "./MarkdownRenderer";
import FileExplorer from "./file-explorer/FileExplorer";
import { FaPlus } from "react-icons/fa";

export type MDEditorMode = "write" | "preview";

const BOTTOM_ROW_HEIGHT = 36;

interface MdEditorFieldProps {
    row: number;
    placeHolder: string;
    text: string;
    setText: Dispatch<SetStateAction<string>>;
    maxCharacters?: number;
    customPreview?: ReactNode;
    onModeChange?: (mode: MDEditorMode) => void;
    isPost?: boolean;
    section: string;
    rootAlias: string;
    required?: boolean;
}

const MdEditorField = ({
    row,
    placeHolder,
    text,
    setText,
    maxCharacters = 4096,
    customPreview,
    onModeChange,
    isPost = true,
    section,
    rootAlias,
    required = true
}: MdEditorFieldProps) => {
    const [mode, setMode] = useState<MDEditorMode>("write");
    const uid = useId();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const textareaHeightRef = useRef<number | null>(null);
    const scrollTopRef = useRef<number>(0);
    const [showImages, setShowImages] = useState(false);
    const [postAttachmentSelectVisible, setPostAttachmentSelectVisible] = useState(false);

    useEffect(() => {
        onModeChange?.(mode);
    }, [mode]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        if (textareaHeightRef.current !== null) {
            textarea.style.height = `${textareaHeightRef.current}px`;
        }
        textarea.scrollTop = scrollTopRef.current;
        const observer = new ResizeObserver(() => {
            if (textarea.offsetHeight > 0) {
                textareaHeightRef.current = textarea.offsetHeight;
            }
        });
        observer.observe(textarea);
        return () => observer.disconnect();
    }, [mode]);

    const handleModeChange = (newMode: MDEditorMode) => {
        if (newMode === "preview" && textareaRef.current) {
            scrollTopRef.current = textareaRef.current.scrollTop;
        }
        setMode(newMode);
    };

    const handlePostAttachments = (selected: string[]) => {
        setText((prev) => (prev.trim().length == 0 || prev.endsWith("\n") ? prev : prev + "\n") + selected.join("\n") + "\n");
    };

    const handleChange = (value: string) => {
        const limitedValue = value.slice(0, maxCharacters);
        setText(limitedValue);
    };

    const insertMarkdown = (syntaxStart: string, syntaxEnd = "", replaceSelection = false) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            if (replaceSelection) {
                handleChange(text + (text.endsWith("\n") ? "" : "\n") + syntaxStart + "\n");
            }
            return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop;
        const selected = replaceSelection ? "" : text.slice(start, end);
        const before = text.slice(0, start);
        const after = text.slice(end);
        const newText = before + syntaxStart + selected + syntaxEnd + after;
        handleChange(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.scrollTop = scrollTop;
            if (replaceSelection) {
                const pos = start + syntaxStart.length;
                textarea.setSelectionRange(pos, pos);
            } else {
                textarea.setSelectionRange(start + syntaxStart.length, end + syntaxStart.length);
            }
        }, 50);
    };

    const toolbarButtons = [
        { icon: "b", className: "fw-bold", action: () => insertMarkdown("**", "**") },
        { icon: "i", className: "fst-italic", action: () => insertMarkdown("_", "_") },
        { icon: "del", className: "text-decoration-line-through", action: () => insertMarkdown("~~", "~~") },
        { icon: "mark", action: () => insertMarkdown("`", "`") },
        { icon: "link", action: () => insertMarkdown("[text](", ")") },
        { icon: "img", action: () => setShowImages(true) },
        { icon: "code", action: () => insertMarkdown("```bash\n", "\n```") },
        { icon: "div", action: () => insertMarkdown("---") },
        { icon: "quote", action: () => insertMarkdown("> ", "") },
        { icon: "heading", action: () => insertMarkdown("### ", "") },
    ];

    return (
        <>
            <PostAttachmentSelect show={postAttachmentSelectVisible} onClose={() => setPostAttachmentSelectVisible(false)} onSubmit={handlePostAttachments} />
            <FileExplorer
                title="Image Select"
                section={section}
                rootAlias={rootAlias}
                show={showImages}
                onHide={() => setShowImages(false)}
                onSelect={(url, alt) => insertMarkdown(`![${alt || "image"}](${url})`, "", true)}
            />
            <div>
                <div className="d-flex overflow-auto mb-2 p-2 bg-light rounded border gap-2">
                    {toolbarButtons.map((btn, idx) => (
                        <button
                            key={idx}
                            className={"btn btn-sm btn-outline-secondary flex-shrink-0" + (btn.className ? " " + btn.className : "")}
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
                    <ToggleButtonGroup type="radio" name={`${uid}-editorMode`} value={mode} onChange={handleModeChange}>
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
                        {isPost ? (
                            <>
                                <PostTextareaControl
                                    ref={textareaRef}
                                    rows={row}
                                    placeholder={placeHolder}
                                    value={text}
                                    setValue={setText}
                                    required={required}
                                    maxLength={maxCharacters}
                                />

                                <div className="d-flex justify-content-between align-items-center" style={{ height: BOTTOM_ROW_HEIGHT }}>
                                    <div className="text-muted small">
                                        {text.length}/{maxCharacters} characters
                                    </div>
                                    <Button variant="link" className="text-secondary" onClick={() => setPostAttachmentSelectVisible(true)}>
                                        <FaPlus />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <FormControl
                                    ref={textareaRef}
                                    as="textarea"
                                    rows={row}
                                    placeholder={placeHolder}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    required={required}
                                    maxLength={maxCharacters}
                                    style={{ overscrollBehavior: "contain" }}
                                />
                                <div className="d-flex justify-content-between align-items-center" style={{ height: BOTTOM_ROW_HEIGHT }}>
                                    <div className="mt-2 text-muted small">
                                        {text.length}/{maxCharacters} characters
                                    </div>
                                </div>
                            </>
                        )}
                    </FormGroup>
                )}

                {mode === "preview" &&
                    (customPreview != null ? (
                        customPreview
                    ) : (
                        <div style={textareaHeightRef.current ? { minHeight: textareaHeightRef.current + BOTTOM_ROW_HEIGHT } : undefined}>
                            <MarkdownRenderer content={text} />
                        </div>
                    ))}
            </div>
        </>
    );
};

export default MdEditorField;
