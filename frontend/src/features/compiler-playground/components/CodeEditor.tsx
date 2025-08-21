import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import WebOutput from "./WebOutput";
import useTab from "../hooks/useTab";
import { ICode } from "../../codes/components/Code";
import CompileOutput from "./CompileOutput";
import { EditorView } from "@codemirror/view";

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
}

const CodeEditor = ({ code, source, setSource, css, setCss, js, setJs, options }: CodeEditorProps) => {
    const [editorTabs, setEditorTabs] = useState<LanguageName[]>([]);
    const { tabOpen, onTabEnter, onTabLeave } = useTab(false);
    const [tabHeight, setTabHeight] = useState("auto");

    useEffect(() => {
        if (code.language == "web") {
            setEditorTabs(["html", "css", "javascript"]);
        } else {
            setEditorTabs([code.language]);
        }
    }, [code]);

    useEffect(() => {
        const callback = () => {
            setTabHeight(`calc(100dvh - ${(document.querySelector(".nav-tabs")?.clientHeight || 0) + 90}px)`);
        }
        addEventListener("resize", callback);
        callback();
        return () => removeEventListener("resize", callback);
    })

    const editorStates = [
        { value: source, setValue: setSource },
        { value: css, setValue: setCss },
        { value: js, setValue: setJs }
    ];

    return (
        <div className="bg-dark" data-bs-theme="dark">
            {
                editorTabs.length > 0 &&
                <Tabs defaultActiveKey={editorTabs[0]} fill justify>
                    {
                        editorTabs.map((lang, idx) => {

                            return (
                                <Tab key={lang} eventKey={lang} title={lang} style={{ height: tabHeight }}>
                                    <ReactCodeMirror
                                        value={editorStates[idx].value}
                                        onChange={value => editorStates[idx].setValue(value)}
                                        width="100%"
                                        height="100%"
                                        style={{ height: "100%", fontSize: `${options.scale * 100}%` }}
                                        theme={vscodeDark}
                                        extensions={[
                                            loadLanguage(lang) as any,
                                            EditorView.theme({
                                                ".cm-content": {
                                                    paddingBottom: tabHeight
                                                }
                                            }),
                                            EditorView.scrollMargins.of(() => ({
                                                bottom: 100
                                            })),
                                            EditorView.updateListener.of((update) => {
                                                // Check if a line break or cursor move happened
                                                if (update.selectionSet || update.docChanged) {
                                                    update.view.dispatch({
                                                        effects: EditorView.scrollIntoView(update.state.selection.main.head, {
                                                            y: "nearest"
                                                        })
                                                    });
                                                }
                                            })
                                        ]}
                                    />
                                </Tab>
                            )
                        })
                    }







                    <Tab onEnter={onTabEnter} onExit={onTabLeave} eventKey={"output"} title={"output"} style={{ height: tabHeight }}>
                        {
                            code.language === "web" ?
                                <WebOutput source={source} cssSource={css} jsSource={js} tabOpen={tabOpen} /> :
                                <CompileOutput source={source} language={code.language} tabOpen={tabOpen} />
                        }
                    </Tab>
                </Tabs>
            }
        </div>
    )
}

export default CodeEditor;
