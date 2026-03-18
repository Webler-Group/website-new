import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
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
        case "javascript": return "javascript";
        case "c":
        case "cpp":        return "c_cpp";
        case "python":     return "python";
        case "ruby":       return "ruby";
        case "lua":        return "lua";
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
    tabHeightStyle: string;
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
    tabHeightStyle,
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
            const isMac = navigator.userAgent.includes("Mac");
            if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
                const match = /^Digit(\d)$/.exec(e.code);
                if (match) {
                    e.preventDefault();
                    const index = parseInt(match[1], 10) - 1;
                    const allTabs = challenge
                        ? ["description", ...editorTabs, "output"]
                        : [...editorTabs, "output"];
                    const tab = allTabs[index];
                    if (tab) setActiveKey(tab);
                } else if (e.key === "k") {
                    e.preventDefault();
                    toggleConsole?.();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [editorTabs, toggleConsole, challenge]);

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
                    editorProps={{ $blockScrolling: true }}
                    style={{ height: "100%", overscrollBehavior: "contain" }}
                />
            );
        },
        [code.language, editorByLang, options.scale, options.lineWrap, source, setSource]
    );


    return (
        <div ref={containerRef} className="bg-dark" data-bs-theme="dark">
            {editorTabs.length > 0 && (
                <Tabs activeKey={activeKey} onSelect={onTabSelect} fill justify>
                    {challenge != null && (
                        <Tab
                            key="description"
                            eventKey="description"
                            title="description"
                            className="bg-white"
                            style={{ height: tabHeightStyle }}
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
                            style={{ height: tabHeightStyle }}
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
                        style={{ height: tabHeightStyle }}
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