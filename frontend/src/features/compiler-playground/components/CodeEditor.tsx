import { cssVars, mergeRefs, Tab, Tabs } from "../../../components/ui";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import AceEditor from "react-ace";
import ace from "ace-builds";

import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/theme-tomorrow_night";

import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-javascript";

import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-ruby";
import "ace-builds/src-noconflict/mode-lua";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/mode-kotlin";
import "ace-builds/src-noconflict/mode-typescript";

import WebOutput from "./WebOutput";
import useTab from "../hooks/useTab";
import CompileOutput from "./CompileOutput";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import ChallengeCodeOutput from "../../challenges/components/ChallengeCodeOutput";

import CompilerLanguagesEnum from "../../../data/CompilerLanguagesEnum";
import { CodeDetails, isCodeSaved, UnsavedCode } from "../../codes/types";
import { ChallengeDetails, ChallengeSubmissionDetails } from "../../challenges/types";

ace.config.set("basePath", new URL("ace-builds/src-noconflict", import.meta.url).pathname);

const compilerLangToAceMode = (lang: CompilerLanguagesEnum | "html" | "css" | "javascript") => {
    switch (lang) {
        case "web":
        case "html":       return "html";
        case "css":        return "css";
        case "javascript":
        case "nodejs":     return "javascript";
        case "c":
        case "cpp":        return "c_cpp";
        case "python":     return "python";
        case "ruby":       return "ruby";
        case "lua":        return "lua";
        case "java":       return "java";
        case "go":         return "golang";
        case "rust":       return "rust";
        case "csharp":     return "csharp";
        case "kotlin":     return "kotlin";
        case "typescript": return "typescript";
        default:           return "text";
    }
};

export interface CodeEditorHandle {
    openSearch: () => void;
}

interface CodeEditorProps {
    code: CodeDetails<undefined | ChallengeSubmissionDetails> | UnsavedCode;
    source: string;
    setSource: (value: string) => void;
    css: string;
    setCss: (value: string) => void;
    js: string;
    setJs: (value: string) => void;
    options: { scale: number; lineWrap: boolean };
    /** Height (px) of the UI above the editor tabs, subtracted from the visible viewport height */
    tabHeightOffset: number;
    consoleVisible?: boolean;
    hideConsole?: () => void;
    toggleConsole?: () => void;
    setLogsCount?: (setter: (prev: number) => number) => void;
    challenge?: ChallengeDetails;
    submission?: ChallengeSubmissionDetails;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(({
    code,
    source,
    setSource,
    css,
    setCss,
    js,
    setJs,
    options,
    tabHeightOffset,
    consoleVisible,
    hideConsole,
    toggleConsole,
    setLogsCount,
    challenge,
    submission,
}, ref) => {
    const [editorTabs, setEditorTabs] = useState<string[]>([]);
    const [activeKey, setActiveKey] = useState<string>();
    const { tabOpen, onTabEnter, onTabLeave } = useTab(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // One ref per tab so search always targets the visible editor
    const aceRefs = useRef<Record<string, AceEditor | null>>({});
    // Line to jump to once the javascript tab has finished showing
    const pendingJsLineRef = useRef<number | null>(null);

    const revealPendingLine = (lang: string) => {
        const line = pendingJsLineRef.current;
        if (lang !== "javascript" || line === null) return;
        pendingJsLineRef.current = null;
        const editor = aceRefs.current[lang]?.editor;
        if (!editor) return;
        editor.resize(true);
        editor.gotoLine(line, 0, true);
        editor.scrollToLine(line, true, true, () => {});
        editor.focus();
    };

    // Called from the web console when a message location is clicked
    const goToJsLine = useCallback((line: number) => {
        hideConsole?.();
        pendingJsLineRef.current = line;
        if (activeKey === "javascript") {
            revealPendingLine("javascript");
        } else {
            setActiveKey("javascript");
        }
    }, [activeKey, hideConsole]);

    // Expose openSearch to parent via ref
    useImperativeHandle(ref, () => ({
        openSearch: () => {
            const currentTab = activeKey ?? editorTabs[0];
            const editor = aceRefs.current[currentTab]?.editor;
            editor?.execCommand("find");
        },
    }), [activeKey, editorTabs]);

    const editorByLang = useMemo(() => {
        const map = new Map<string, { value: string; setValue: (v: string) => void }>();
        map.set("html",       { value: source, setValue: setSource });
        map.set("css",        { value: css,    setValue: setCss });
        map.set("javascript", { value: js,     setValue: setJs });
        return map;
    }, [source, setSource, css, setCss, js, setJs]);

    useEffect(() => {
        if (code.language === "web") {
            setEditorTabs(["html", "css", "javascript"]);
            setActiveKey("html");
        } else {
            setEditorTabs([code.language]);
            setActiveKey(code.language);
        }
    }, [isCodeSaved(code) ? code.id : undefined, code.language]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Playground shortcuts use Alt+Shift (Option+Shift on Mac) so they don't
            // override browser shortcuts like Ctrl/Cmd+1..9 (tabs) or Ctrl/Cmd+K (search).
            // e.code is used because Shift/Option change e.key (e.g. "!" or "⁄").
            //   Alt+Shift+1..9  switch editor tab
            //   Alt+Shift+K     toggle console
            if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;

            const match = /^Digit(\d)$/.exec(e.code);
            if (match) {
                e.preventDefault();
                const index = parseInt(match[1], 10) - 1;
                const allTabs = challenge
                    ? ["description", ...editorTabs, "output"]
                    : [...editorTabs, "output"];
                const tab = allTabs[index];
                if (tab) setActiveKey(tab);
            } else if (e.code === "KeyK") {
                e.preventDefault();
                toggleConsole?.();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [editorTabs, toggleConsole, challenge]);

    // When the available height changes (e.g. the virtual keyboard opens on mobile and the
    // container shrinks), make Ace re-measure and keep the cursor visible above the keyboard.
    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof ResizeObserver === "undefined") return;

        let frame = 0;
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                Object.values(aceRefs.current).forEach((aceComponent) => {
                    const editor = aceComponent?.editor;
                    if (!editor) return;
                    editor.resize();
                    if (editor.isFocused()) {
                        editor.renderer.scrollCursorIntoView();
                    }
                });
            });
        });
        observer.observe(container);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, []);

    const onTabSelect = (key: string | null) => {
        if (key) setActiveKey(key);
    };

    const renderAce = useCallback(
        (lang: string) => {
            const isWeb = code.language === "web";
            const entry = isWeb
                ? editorByLang.get(lang)
                : { value: source, setValue: setSource };

            const value    = entry?.value    ?? "";
            const setValue = entry?.setValue ?? (() => {});

            return (
                <AceEditor
                    ref={(el) => { aceRefs.current[lang] = el; }}
                    mode={compilerLangToAceMode(lang as any)}
                    theme="tomorrow_night"
                    value={value}
                    onChange={(v) => setValue(v)}
                    width="100%"
                    height="100%"
                    fontSize={options.scale * 16}
                    showGutter
                    showPrintMargin={false}
                    wrapEnabled={options.lineWrap}
                    setOptions={{ useWorker: false, tabSize: 2 }}
                    onFocus={(_e, editor) => {
                        // Keyboard animation finishes after focus; re-check once the viewport settled
                        setTimeout(() => {
                            editor?.resize();
                            editor?.renderer.scrollCursorIntoView();
                        }, 350);
                    }}
                    editorProps={{ $blockScrolling: true }}
                    className="wb-compiler-playground-ace-editor"
                />
            );
        },
        [code.language, editorByLang, options.scale, options.lineWrap, source, setSource]
    );


    return (
        <div
            ref={mergeRefs(containerRef, cssVars({ "--wb-compiler-playground-editor-offset": tabHeightOffset }))}
            className="bg-dark"
            data-bs-theme="dark"
        >
            {editorTabs.length > 0 && (
                <Tabs activeKey={activeKey} onSelect={onTabSelect} fill justify>
                    {challenge != null && (
                        <Tab
                            key="description"
                            eventKey="description"
                            title="description"
                            className="wb-compiler-playground-editor-tab bg-white"
                        >
                            <div className="overflow-y-auto h-100 p-2">
                                <MarkdownRenderer content={challenge.description} />
                            </div>
                        </Tab>
                    )}

                    {editorTabs.map((lang) => (
                        <Tab
                            key={lang}
                            eventKey={lang}
                            title={lang}
                        className="wb-compiler-playground-editor-tab"
                            onEntered={() => revealPendingLine(lang)}
                        >
                            {renderAce(lang)}
                        </Tab>
                    ))}

                    <Tab
                        onEnter={onTabEnter}
                        onExit={onTabLeave}
                        key="output"
                        eventKey="output"
                        title="output"
                        className="wb-compiler-playground-editor-tab"
                    >
                        {challenge != null ? (
                            <ChallengeCodeOutput
                                source={source}
                                language={code.language}
                                challenge={challenge}
                                submission={submission}
                            />
                        ) : code.language === "web" ? (
                            <WebOutput
                                source={source}
                                cssSource={css}
                                jsSource={js}
                                tabOpen={tabOpen}
                                consoleVisible={consoleVisible}
                                hideConosole={hideConsole}
                                setLogsCount={setLogsCount}
                                onLocationClick={goToJsLine}
                            />
                        ) : (
                            <CompileOutput
                                source={source}
                                language={code.language}
                                tabOpen={tabOpen}
                            />
                        )}
                    </Tab>
                </Tabs>
            )}
        </div>
    );
});

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;