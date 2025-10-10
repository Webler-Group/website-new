import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import WebOutput from "./WebOutput";
import useTab from "../hooks/useTab";
import { ICode } from "../../codes/components/Code";
import CompileOutput from "./CompileOutput";
import { EditorView, keymap } from "@codemirror/view";
import {
    acceptCompletion,
    completionKeymap,
    completionStatus,
} from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { Prec } from "@codemirror/state";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import ChallengeCodeOutput from "../../challenges/components/ChallengeCodeOutput";
import { IChallenge, IChallengeSubmission } from "../../challenges/types";

interface CodeEditorProps {
    code: ICode;
    source: string;
    setSource: (value: string) => void;
    css: string;
    setCss: (value: string) => void;
    js: string;
    setJs: (value: string) => void;
    options: { scale: number };
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
    submission
}: CodeEditorProps) => {
    const [editorTabs, setEditorTabs] = useState<LanguageName[]>([]);
    const [activeKey, setActiveKey] = useState<string>();
    const { tabOpen, onTabEnter, onTabLeave } = useTab(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const editorStates = useMemo(
        () => [
            { value: source, setValue: setSource, lang: "html" as LanguageName },
            { value: css, setValue: setCss, lang: "css" as LanguageName },
            { value: js, setValue: setJs, lang: "javascript" as LanguageName },
        ],
        [source, css, js, setSource, setCss, setJs]
    );

    useEffect(() => {
        if (code.language === "web") {
            setEditorTabs(["html", "css", "javascript"]);
            setActiveKey("html");
        } else {
            setEditorTabs([code.language as LanguageName]);
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
                    const allTabs = challenge ? ["description", ...editorTabs, "output"] : [...editorTabs, "output"];
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
    }, [editorTabs]);

    const onTabSelect = (key: string | null) => {
        if (key) setActiveKey(key);
    };

    const getExtensions = useCallback(
        (lang: LanguageName) => [
            loadLanguage(lang) as any,
            EditorView.theme({
                ".cm-content": {
                    paddingBottom: "32px",
                    paddingRight: "32px",
                },
            }),
            EditorView.scrollMargins.of(() => ({ bottom: 64, right: 64 })),
            Prec.high(
                keymap.of([
                    {
                        key: "Tab",
                        run: (view) => {
                            const status = completionStatus(view.state);
                            if (status === "active" || status === "pending")
                                return acceptCompletion(view);
                            return indentWithTab.run ? indentWithTab.run(view) : false;
                        },
                    },
                    {
                        key: "Enter",
                        run: (view) => {
                            const status = completionStatus(view.state);
                            if (status === "active" || status === "pending")
                                return acceptCompletion(view);
                            return false;
                        },
                    },
                ])
            ),
            keymap.of(completionKeymap),
        ],
        []
    );

    return (
        <div ref={containerRef} className="bg-dark" data-bs-theme="dark">
            {editorTabs.length > 0 && (
                <Tabs activeKey={activeKey} onSelect={onTabSelect} fill justify>
                    {
                        challenge != null &&
                        <Tab
                            key={"description"}
                            eventKey={"description"}
                            title={"description"}
                            className="bg-white p-2"
                            style={{ height: tabHeightStyle }}>
                            <MarkdownRenderer content={challenge.description} />
                        </Tab>
                    }
                    {editorTabs.map((lang, idx) => (
                        <Tab
                            key={lang}
                            eventKey={lang}
                            title={lang}
                            style={{ height: tabHeightStyle }}
                        >
                            <ReactCodeMirror
                                value={editorStates[idx].value}
                                onChange={(value) => editorStates[idx].setValue(value)}
                                width="100%"
                                height="100%"
                                style={{
                                    height: "100%",
                                    fontSize: `${options.scale * 100}%`,
                                    overscrollBehavior: "contain",
                                }}
                                theme={vscodeDark}
                                extensions={getExtensions(lang)}
                            />
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
                        {code.challengeId != null ?
                            <ChallengeCodeOutput source={source} language={code.language} challenge={challenge!} submission={submission} />
                            :
                            code.language === "web" ?
                                <WebOutput
                                    source={source}
                                    cssSource={css}
                                    jsSource={js}
                                    tabOpen={tabOpen}
                                    consoleVisible={consoleVisible}
                                    hideConosole={hideConsole}
                                    setLogsCount={setLogsCount}
                                />
                                :
                                <CompileOutput source={source} language={code.language} tabOpen={tabOpen} />
                        }
                    </Tab>
                </Tabs>
            )}
        </div>
    );
};

export default CodeEditor;
