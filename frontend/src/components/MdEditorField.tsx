import { FormGroup, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import PostTextareaControl from "./PostTextareaControl";
import PostAttachmentSelect from "./PostAttachmentSelect";
import MarkdownRenderer from "./MarkdownRenderer";
import allowedUrls from "../data/discussAllowedUrls";

interface MdEditorFieldProps {
    row: number;
    placeHolder: string;
    text: string;
    setText: Dispatch<SetStateAction<string>>;
    maxCharacters?: number;
}


const MdEditorField = 
  ({ row, placeHolder, text, setText, maxCharacters = 4096}: MdEditorFieldProps) => {

    const [mode, setMode] = useState<"write" | "preview">("write"); // <-- toggle state
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    
    const handlePostAttachments = (selected: string[]) => {
        setText(prev => (prev.trim().length == 0 || prev.endsWith("\n") ? prev : prev + "\n") + selected.join("\n") + "\n");
    }

    const handleChange = (value: string) => {
      const limitedValue = value.slice(0, maxCharacters);
      setText(limitedValue);
    };

    const insertMarkdown = (syntaxStart: string, syntaxEnd = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = text.slice(start, end);
      const before = text.slice(0, start);
      const after = text.slice(end);
      const newText = before + syntaxStart + selected + syntaxEnd + after;
      handleChange(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + syntaxStart.length,
          end + syntaxStart.length
        );
      }, 0);
    };

    const toolbarButtons = [
        { icon: "B", title: "Bold", action: () => insertMarkdown("**", "**") },
        { icon: "I", title: "Italic", action: () => insertMarkdown("_", "_") },
        { icon: "S", title: "Small", action: () => insertMarkdown("~~", "~~") },
        { icon: "M", title: "Mark", action: () => insertMarkdown("`", "`") },
        {
            icon: "H3",
            title: "Heading",
            action: () => insertMarkdown("### ", ""),
        },
        {
            icon: "🔗",
            title: "Link",
            action: () => insertMarkdown("[text](", ")"),
        },
        {
            icon: "🖼️",
            title: "Image",
            action: () => insertMarkdown("![alt text](", ")"),
        },
        {
            icon: "•",
            title: "List",
            action: () => insertMarkdown("- ", ""),
        },
        {
            icon: "</>",
            title: "Code Block",
            action: () => insertMarkdown("```bash\n", "\n```"),
        },
        {
            icon: "❝",
            title: "Quote",
            action: () => insertMarkdown("> ", ""),
        },
        {
            icon: "1️⃣",
            title: "Numbered List",
            action: () => insertMarkdown("1. ", ""),
        },
        {
            icon: "|",
            title: "Divider",
            action: () => insertMarkdown("---"),
        }
    ];

    return (
        <div className="container my-4">

            {/* Toolbar */}
            <div
                className="d-flex overflow-auto mb-2 p-2 bg-light rounded border"
                style={{ whiteSpace: "nowrap", gap: "0.5rem" }}
                >
                {toolbarButtons.map((btn, idx) => (
                    <button
                    key={idx}
                    className="btn btn-sm btn-outline-secondary flex-shrink-0"
                    title={btn.title}
                    onClick={btn.action}
                    style={{ minWidth: "40px" }}
                    >
                    {btn.icon}
                    </button>
                ))}
            </div>

            {/* Toggle Write/Preview */}
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

            {/* Write Mode */}
            {mode === "write" && (
                <FormGroup className="mb-3">
                    <PostTextareaControl
                        ref={textareaRef}
                        rows={row}
                        placeholder={placeHolder}
                        value={text}
                        setValue={setText}
                        required
                        maxLength={maxCharacters}
                    />
                    {/* onChange={(e) => handleChange(e.target.value)} */}

                    <div className="d-flex justify-content-between">
                        <div className="mt-2 text-muted small">
                            {text.length}/{maxCharacters} characters
                        </div>
                        <PostAttachmentSelect onSubmit={handlePostAttachments} />
                    </div>
                </FormGroup>
            )}

            {/* Preview Mode */}
            {mode === "preview" && (
                <div className="p-3 border rounded bg-light">
                    <div className="wb-feed-content__message">
                        <MarkdownRenderer content={text} allowedUrls={allowedUrls} />
                    </div>
                </div>
            )}

        </div>
    );
};


export default MdEditorField;