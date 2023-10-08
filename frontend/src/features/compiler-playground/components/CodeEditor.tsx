import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { ReactNode, useEffect, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import WebOutput from "./WebOutput";
import useTab from "../hooks/useTab";
import { ICode } from "../../codes/components/Code";
import ApiCommunication from "../../../helpers/apiCommunication";


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

const compiledHtmlTemplate = (body: string) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    ${body}
</body>
</html>`;
}

const CodeEditor = ({ code, source, setSource, css, setCss, js, setJs, options }: CodeEditorProps) => {

    const [editorTabs, setEditorTabs] = useState<LanguageName[]>([]);

    const { tabOpen, onTabEnter, onTabLeave } = useTab(false);

    const [compiledHTML, setCompiledHTML] = useState("");
    const [isCompiled, setIsCompiled] = useState(false);

    useEffect(() => {
        setIsCompiled(false)
        setCompiledHTML(compiledHtmlTemplate(`<p>Compiling, please wait...</p>`))
    }, [source])

    useEffect(() => {
        if (tabOpen && !isCompiled) {
            getCompiledHTML();
        }
    }, [tabOpen]);

    useEffect(() => {

        switch (code.language) {
            case "web":
                setEditorTabs(["html", "css", "javascript"]);
                break;
            case "c":
                setEditorTabs(["c"]);
                break;
            case "cpp":
                setEditorTabs(["cpp"]);
                break;
        }

    }, [code]);

    const getCompiledHTML = async () => {

        const result = await ApiCommunication.sendJsonRequest(`/Codes/Compile`, "POST", { source: source, language: code.language });

        if (result && result.compiledHTML) {
            setCompiledHTML(result.compiledHTML);
        }
        else {
            setCompiledHTML(compiledHtmlTemplate(`<p style="color: red; background: black;">${result.message}</p>`))
        }
        setIsCompiled(true)
    }

    let outputTab: ReactNode;
    switch (code.language) {
        case "web":
            outputTab = <WebOutput source={source} cssSource={css} jsSource={js} tabOpen={tabOpen} language={code.language} />;
            break;
        case "c": case "cpp":
            outputTab = <WebOutput source={compiledHTML} cssSource={css} jsSource={js} tabOpen={tabOpen} language={code.language} />;
            break;
    }

    const editorStates = [
        { value: source, setValue: setSource },
        { value: css, setValue: setCss },
        { value: js, setValue: setJs }
    ];

    return (
        <div className="bg-dark" data-bs-theme="dark">
            {
                editorTabs.length > 0 &&
                <Tabs defaultActiveKey={editorTabs[0]} fill>
                    {
                        editorTabs.map((lang, idx) => {

                            return (
                                <Tab key={lang} eventKey={lang} title={lang} className="wb-playground-container__content">
                                    <ReactCodeMirror
                                        value={editorStates[idx].value}
                                        onChange={value => editorStates[idx].setValue(value)}
                                        width="100%"
                                        height="100%"
                                        style={{ height: "100%", fontSize: `${options.scale * 100}%` }}
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

export default CodeEditor
