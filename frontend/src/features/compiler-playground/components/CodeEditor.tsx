import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { ReactNode, useEffect, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import WebOutput from "./WebOutput";
import useTab from "../hooks/useTab";

interface Code {
    id?: string;
    type: string;
    source: string;
    cssSource: string;
    jsSource: string;
}

interface CodeEditorProps {
    code: Code;
}
const CodeEditor = ({ code }: CodeEditorProps) => {

    const [source, setSource] = useState("");
    const [cssSource, setCssSource] = useState("");
    const [jsSource, setJsSource] = useState("");

    const [editorTabs, setEditorTabs] = useState<LanguageName[]>([]);

    const { tabOpen, onTabEnter, onTabLeave } = useTab(false);

    useEffect(() => {

        setSource(code.source)
        setCssSource(code.cssSource)
        setJsSource(code.jsSource)

        switch (code.type) {
            case "web":
                setEditorTabs(["html", "css", "javascript"]);
                break;
        }

    }, [code]);

    let outputTab: ReactNode;
    switch (code.type) {
        case "web":
            outputTab = <WebOutput source={source} cssSource={cssSource} jsSource={jsSource} tabOpen={tabOpen} />;
            break;
    }

    return (
        <div className="bg-dark wb-playground-wrapper" data-bs-theme="dark">
            {
                editorTabs.length > 0 &&
                <Tabs defaultActiveKey={editorTabs[0]} fill>
                    {
                        editorTabs.map((lang, idx) => {
                            const sources = [
                                { source, setSource },
                                { source: cssSource, setSource: setCssSource },
                                { source: jsSource, setSource: setJsSource }
                            ];

                            return (
                                <Tab key={lang} eventKey={lang} title={lang} className="wb-playground-container__content">
                                    <ReactCodeMirror
                                        value={sources[idx].source}
                                        onChange={value => sources[idx].setSource(value)}
                                        width="100%"
                                        height="100%"
                                        style={{ height: "100%" }}
                                        theme={vscodeDark}
                                        extensions={code ? [loadLanguage(lang) as any] : []} />
                                </Tab>
                            )
                        })
                    }
                    <Tab onEnter={onTabEnter} onExit={onTabLeave} eventKey={"output"} title={"output"} className="wb-playground-container__content">
                        {
                            outputTab
                        }
                    </Tab>
                </Tabs>
            }
        </div>
    )
}

export type {
    Code
}

export default CodeEditor