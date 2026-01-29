import { useEffect, useState } from "react";

interface EditorOptions {
    scale: number;
    lineWrap: boolean;
}

const useEditorOptions = () => {
    const [editorOptions, setEditorOptions] = useState<EditorOptions>({ scale: 1.0, lineWrap: false });

    useEffect(() => {
        const editorValue = localStorage.getItem("editor");
        if (editorValue !== null) {
            setEditorOptions(JSON.parse(editorValue));
        }
    }, []);

    const updateEditorOptions = (value: EditorOptions) => {
        setEditorOptions(value);
        localStorage.setItem("editor", JSON.stringify(value));
    }

    return { editorOptions, updateEditorOptions };
}

export default useEditorOptions;