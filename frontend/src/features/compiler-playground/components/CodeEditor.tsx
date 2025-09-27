import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
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
import { EditorSelection, Prec } from "@codemirror/state";

interface CodeEditorProps {
    code: ICode;
    source: string;
    setSource: (value: string) => void;
    css: string;
    setCss: (value: string) => void;
    js: string;
    setJs: (value: string) => void;
    loading: boolean;
    options: { scale: number };
    consoleVisible: boolean;
    hideConsole: () => void;
    toggleConsole: () => void;
    setLogsCount: (setter: (prev: number) => number) => void;
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
    consoleVisible,
    hideConsole,
    toggleConsole,
    setLogsCount,
}: CodeEditorProps) => {
    const [editorTabs, setEditorTabs] = useState<LanguageName[]>([]);
    const [activeKey, setActiveKey] = useState<string>();
    const { tabOpen, onTabEnter, onTabLeave } = useTab(false);
    const [tabHeight, setTabHeight] = useState("auto");

    useEffect(() => {
        if (code.language == "web") {
            setEditorTabs(["html", "css", "javascript"]);
            setActiveKey("html");
        } else {
            setEditorTabs([code.language as LanguageName]);
            setActiveKey(code.language);
        }
    }, [code.id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.userAgent.includes("Mac");

            if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
                const match = /^Digit(\d)$/.exec(e.code);
                if (match) {
                    e.preventDefault();

                    const index = parseInt(match[1], 10) - 1;
                    const tab = index == editorTabs.length ? "output" : editorTabs[index];
                    if (tab) {
                        setActiveKey(tab);
                    }
                } else if (e.key === "k") {
                    e.preventDefault();
                    toggleConsole();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [editorTabs]);

    useEffect(() => {
        const callback = () => {
            setTabHeight(
                `calc(100dvh - ${(document.querySelector(".nav-tabs")?.clientHeight || 0) + 90}px)`
            );
        };
        addEventListener("resize", callback);
        callback();
        return () => removeEventListener("resize", callback);
    }, []);

    const editorStates = [
        { value: source, setValue: setSource },
        { value: css, setValue: setCss },
        { value: js, setValue: setJs },
    ];

    const onTabSelect = (key: string | null) => {
        if (key) {
            setActiveKey(key);
        }
    };

    const insertTab = (view: EditorView) => {
        const changes = view.state.changeByRange(range => ({
            changes: { from: range.from, insert: "\t" },
            range: EditorSelection.cursor(range.from + 1)
        }));
        view.dispatch(changes, { userEvent: "input" });
        return true;
    };

    return (
        <div className="bg-dark" data-bs-theme="dark">
            {editorTabs.length > 0 && (
                <Tabs activeKey={activeKey} onSelect={onTabSelect} fill justify>
                    {editorTabs.map((lang, idx) => {
                        return (
                            <Tab
                                key={lang}
                                eventKey={lang}
                                title={lang}
                                style={{ height: tabHeight }}
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
                                    extensions={[
                                        loadLanguage(lang) as any,
                                        EditorView.theme({
                                            ".cm-content": {
                                                paddingBottom: tabHeight,
                                                paddingRight: "64px",
                                            },
                                        }),
                                        EditorView.scrollMargins.of(() => ({
                                            bottom: 64,
                                            right: 64,
                                        })),
                                        EditorView.updateListener.of((update) => {
                                            if (update.selectionSet) {
                                                const selectionPos =
                                                    update.state.selection.main.head;
                                                const visibleRanges = update.view.visibleRanges;
                                                let inView = false;
                                                for (const range of visibleRanges) {
                                                    if (
                                                        selectionPos >= range.from &&
                                                        selectionPos <= range.to
                                                    ) {
                                                        inView = true;
                                                        break;
                                                    }
                                                }
                                                if (!inView) {
                                                    update.view.dispatch({
                                                        effects: EditorView.scrollIntoView(selectionPos, {
                                                            y: "nearest",
                                                        }),
                                                    });
                                                }
                                            }
                                        }),
                                        Prec.high(
                                            keymap.of([
                                                {
                                                    key: "Tab",
                                                    run: (view) => {
                                                        const status = completionStatus(view.state);
                                                        if (status === "active" || status === "pending") return acceptCompletion(view);
                                                        return indentWithTab.run ? indentWithTab.run(view) : insertTab(view);
                                                    }
                                                },
                                                {
                                                    key: "Enter",
                                                    run: (view) => {
                                                        const status = completionStatus(view.state);
                                                        if (status === "active" || status === "pending") {
                                                            return acceptCompletion(view);
                                                        }
                                                        return false;
                                                    },
                                                },
                                            ])
                                        ),
                                        keymap.of(completionKeymap),
                                    ]}
                                />
                            </Tab>
                        );
                    })}
                    <Tab
                        onEnter={onTabEnter}
                        onExit={onTabLeave}
                        key={"output"}
                        eventKey={"output"}
                        title={"output"}
                        style={{ height: tabHeight }}
                    >
                        {code.language === "web" ? (
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
