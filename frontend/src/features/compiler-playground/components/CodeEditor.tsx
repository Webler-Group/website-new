import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import AceEditor from "react-ace";

import WebOutput from "./WebOutput";
import useTab from "../hooks/useTab";
import { ICode } from "../../codes/components/Code";
import CompileOutput from "./CompileOutput";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import ChallengeCodeOutput from "../../challenges/components/ChallengeCodeOutput";
import { IChallenge, IChallengeSubmission } from "../../challenges/types";

import "ace-builds/src-noconflict/theme-tomorrow_night";

import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-javascript";

import "ace-builds/src-noconflict/mode-c_cpp";   // C + C++
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-ruby";
import "ace-builds/src-noconflict/mode-lua";
import { compilerLanguages } from "../../../data/compilerLanguages";

const compilerLangToAceMode = (lang: compilerLanguages | "html" | "css" | "javascript") => {
    switch (lang) {
        case "web":
        case "html":
            return "html";

        case "css":
            return "css";

        case "javascript":
            return "javascript";

        case "c":
        case "cpp":
            return "c_cpp";

        case "python":
            return "python";

        case "ruby":
            return "ruby";

        case "lua":
            return "lua";

        default:
            return "text";
    }
}


interface CodeEditorProps {
    code: ICode;
    source: string;
    setSource: (value: string) => void;
    css: string;
    setCss: (value: string) => void;
    js: string;
    setJs: (value: string) => void;
    options: { scale: number, lineWrap: boolean };
    tabHeightStyle: string;
    consoleVisible?: boolean;
    hideConsole?: () => void;
    toggleConsole?: () => void;
    setLogsCount?: (setter: (prev: number) => number) => void;
    challenge?: IChallenge;
    submission?: IChallengeSubmission;
}



const CodeEditor = ({
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
}: CodeEditorProps) => {
    const [editorTabs, setEditorTabs] = useState<string[]>([]);
    const [activeKey, setActiveKey] = useState<string>();
    const { tabOpen, onTabEnter, onTabLeave } = useTab(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Prefer mapping by lang (not idx) to avoid bugs with description/output tabs
    const editorByLang = useMemo(() => {
        const map = new Map<string, { value: string; setValue: (v: string) => void }>();
        map.set("html", { value: source, setValue: setSource });
        map.set("css", { value: css, setValue: setCss });
        map.set("javascript", { value: js, setValue: setJs });
        // For non-web single-language codes, reuse `source`
        // (your current design already uses source for non-web)
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
    }, [code.id, code.language]);

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

            const value = entry?.value ?? "";
            const setValue = entry?.setValue ?? (() => { });

            return (
                <AceEditor
                    mode={compilerLangToAceMode(lang as any)}
                    theme="tomorrow_night"
                    value={value}
                    onChange={(v) => setValue(v)}
                    width="100%"
                    height="100%"
                    fontSize={options.scale * 16} // mobile-friendly
                    showGutter
                    showPrintMargin={false}
                    wrapEnabled={options.lineWrap}
                    setOptions={{
                        useWorker: false, // important for performance/sandboxing
                        tabSize: 2
                    }}
                    editorProps={{ $blockScrolling: true }}
                    style={{
                        height: "100%",
                        overscrollBehavior: "contain",
                    }}
                />
            );
        },
        [code.language, editorByLang, options.scale, source, setSource]
    );

    return (
        <div ref={containerRef} className="bg-dark" data-bs-theme="dark">
            {editorTabs.length > 0 && (
                <Tabs activeKey={activeKey} onSelect={onTabSelect} fill justify>
                    {challenge != null && (
                        <Tab
                            key={"description"}
                            eventKey={"description"}
                            title={"description"}
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
                        key={"output"}
                        eventKey={"output"}
                        title={"output"}
                        style={{ height: tabHeightStyle }}
                    >
                        {code.challengeId != null ? (
                            <ChallengeCodeOutput
                                source={source}
                                language={code.language}
                                challenge={challenge!}
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
};

export default CodeEditor;
