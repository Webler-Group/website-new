import { useState } from "react";

interface EditorOptions {
    scale: number;
    lineWrap: boolean;
}

const DEFAULT_OPTIONS: EditorOptions = { scale: 1.0, lineWrap: false };

/** Reads stored options, falling back to defaults on missing / corrupted / inaccessible storage */
const loadEditorOptions = (): EditorOptions => {
    try {
        const raw = localStorage.getItem("editor");
        if (raw === null) return DEFAULT_OPTIONS;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return DEFAULT_OPTIONS;
        return {
            scale: typeof parsed.scale === "number" && isFinite(parsed.scale) && parsed.scale > 0 ? parsed.scale : DEFAULT_OPTIONS.scale,
            lineWrap: typeof parsed.lineWrap === "boolean" ? parsed.lineWrap : DEFAULT_OPTIONS.lineWrap,
        };
    } catch {
        return DEFAULT_OPTIONS;
    }
};

const useEditorOptions = () => {
    const [editorOptions, setEditorOptions] = useState<EditorOptions>(loadEditorOptions);

    const updateEditorOptions = (value: EditorOptions) => {
        setEditorOptions(value);
        try {
            localStorage.setItem("editor", JSON.stringify(value));
        } catch {
            // storage unavailable (private mode / quota) - keep options for this session only
        }
    };

    return { editorOptions, updateEditorOptions };
};

export default useEditorOptions;
