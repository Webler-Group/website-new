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

const CodeEditor = ({ code, source, setSource, css, setCss, js, setJs, options }: CodeEditorProps) => {

    const [editorTabs, setEditorTabs] = useState<LanguageName[]>([]);

    const { tabOpen, onTabEnter, onTabLeave } = useTab(false);

    const [compiledHTML, setCompiledHTML] = useState("");
    const [isCompiled, setIsCompiled] = useState(false);

    const [tabHeight, setTabHeight] = useState("auto");

    useEffect(() => {
        setIsCompiled(false)
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
            case "python":
                setEditorTabs(["python"]);
                break;
        }

    }, [code]);

    useEffect(() => {
        const callback = () => {
            setTabHeight(`calc(100dvh - ${(document.querySelector(".nav-tabs")?.clientHeight || 0) + 120}px)`);
        }
        addEventListener("resize", callback)
        callback()
        return () => removeEventListener("resize", callback)
    })

    const getCompiledHTML = async () => {

        const result = await ApiCommunication.sendJsonRequest(`/Codes/Compile`, "POST", { source: source, language: code.language });

        if (result && result.compiledHTML) {
            setCompiledHTML(result.compiledHTML);
        }
        setIsCompiled(true)
    }

    let outputTab: ReactNode;
    switch (code.language) {
        case "web":
            outputTab = <WebOutput source={source} cssSource={css} jsSource={js} tabOpen={tabOpen} language={code.language} isCompiled={true} />;
            break;
        case "c": case "cpp":
            outputTab = <WebOutput source={compiledHTML} cssSource={css} jsSource={js} tabOpen={tabOpen} language={code.language} isCompiled={isCompiled} />;
            break;
        case "python":
            const pythonBundle = `<!DOCTYPE html>
<html>
<head>
<script src="https://cdn.jsdelivr.net/npm/brython@3/brython.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/brython@3/brython_stdlib.js"></script>
</head>
<body onload="brython()">
<script type="text/python">
${source}
</script>
</body>
</html>` ; 
            outputTab = <WebOutput source={pythonBundle} cssSource={css} jsSource={js} tabOpen={tabOpen} language={code.language} isCompiled={true} />;
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
                                        extensions={code ? [loadLanguage(lang) as any] : []} />
                                </Tab>
                            )
                        })
                    }
                    <Tab onEnter={onTabEnter} onExit={onTabLeave} eventKey={"output"} title={"output"} style={{ height: tabHeight }}>
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
