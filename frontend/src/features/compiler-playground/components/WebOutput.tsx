import { useEffect, useRef, useState } from "react"
import { Badge, Button, Modal } from "react-bootstrap";
import { FaCircleInfo, FaCircleXmark, FaTriangleExclamation } from "react-icons/fa6";

interface WebOutputProps {
    source: string;
    cssSource: string;
    jsSource: string;
    tabOpen: boolean;
    language: string;
    isCompiled: boolean;
}

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>`;

const WebOutput = ({ source, cssSource, jsSource, tabOpen, language, isCompiled }: WebOutputProps) => {


    const [consoleVisible, setConsoleVisible] = useState(false);
    const [consoleMessages, setConsoleLogs] = useState<{ data: any[]; method: string; count: number }[]>([]);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const consoleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const callback: (this: Window, ev: MessageEvent<any>) => void = function (response: any) {

            if (response.data && response.data.console) {

                const console = response.data.console;
                switch (console.method) {
                    case "clear":
                        clearConsole();
                        break;
                    default:
                        setConsoleLogs(logs => {
                            if (logs.length > 0 && logs[logs.length - 1].method === console.method && logs[logs.length - 1].data.every((item, i) => item === console.data[i])) {
                                return logs.map((log, i) => i === logs.length - 1 ? { ...log, count: log.count + 1 } : { ...log })
                            }
                            return [...logs, { data: console.data, method: console.method, count: 1 }]
                        });
                }
            }
        }
        window.addEventListener("message", callback);
        return () => window.removeEventListener("message", callback);
    }, []);

    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            if (tabOpen && isCompiled) {
                let output = (() => {
                    switch (language) {
                        case "web": return genOutput();
                        case "cpp": case "c": return source;
                        case "python": return source;
                    }
                })()

                setConsoleLogs([]);
                iframeRef.current.contentWindow.postMessage(output, "*");

            }
            else {
                iframeRef.current.contentWindow.postMessage(htmlTemplate, "*");
            }
        }
    }, [tabOpen, source, isCompiled]);

    const clearConsole = () => {
        setConsoleLogs(() => [])
    }

    const genOutput = () => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(source, "text/html");

        const head = doc.head || doc.getElementsByTagName('head')[0];
        const body = doc.body || doc.getElementsByTagName('body')[0];

        const style = document.createElement("style");
        style.appendChild(document.createTextNode(cssSource));
        head.appendChild(style);

        const script = document.createElement("script");
        script.text = jsSource;
        body.appendChild(script);

        return '<!DOCTYPE HTML>' + '\n' + doc.documentElement.outerHTML;
    }

    const onConsoleShow = () => {
        setConsoleVisible(true);
    }

    const onConsoleHide = () => {
        setConsoleVisible(false);
    }

    const processDataItem = (item: any, depth: number, method: string) => {

        if (typeof item === "undefined") {
            return <span style={{ color: "#80868B" }}>{"undefined"}</span>
        }
        if (typeof item === "bigint") {
            return <span style={{ color: "#80868B" }}>{item + "n"}</span>
        }
        if (typeof item === "number" || typeof item === "boolean") {
            return <span style={{ color: "#9980FF" }}>{item.toString()}</span>
        }
        if (typeof item === "string") {
            if (depth === 0) {
                let textColorClass = (() => {
                    switch (method) {
                        case "info": return "text-info";
                        case "error": return "text-danger";
                        case "warn": return "text-warning";
                        default: return "text-white";
                    }
                })()
                return <span className={textColorClass}>{item}</span>
            }
            return <span style={{ color: "#35D4C7" }}>{`'${item}'`}</span>
        }
        if (typeof item === "object") {
            if (item === null) {
                return <span style={{ color: "#80868B" }}>{"null"}</span>
            }
            if (item.__type === "function") {
                return <i>
                    <span style={{ color: "#F29766" }}>{"f "}</span>
                    <span style={{ color: "#FFFFFF" }}>{item.__name}</span>
                </i>
            }
            if (item.__type === "symbol") {
                let description = typeof item.__description === "undefined" ? "" : `'${item.__description}'`;
                return <span style={{ color: "#35D4C7" }}>{`Symbol(${description})`}</span>
            }
            if (item instanceof Date) {
                return <span style={{ color: "#35D4C7" }}>{`'${item.toString()}'`}</span>
            }
            if (item instanceof Array) {
                return <i>
                    <span style={{ color: "#FFFFFF" }}>{"["}</span>
                    {
                        item.map((elem, idx) => {
                            return idx > 0 ?
                                <span key={idx}>
                                    <span style={{ color: "#FFFFFF" }}>{", "}</span>
                                    {processDataItem(elem, depth + 1, method)}
                                </span>
                                :
                                <span key={idx}>{processDataItem(elem, depth + 1, method)}</span>
                        })
                    }
                    <span style={{ color: "#FFFFFF" }}>{"]"}</span>
                </i>
            }
            if (item instanceof RegExp) {
                return <span style={{ color: "#35D4C7" }}>{`${item.toString()}`}</span>
            }
            if (item.constructor.name === "Object") {
                return <i>
                    <span style={{ color: "#FFFFFF" }}>{"{ "}</span>
                    {
                        Object.entries(item).map((entry, idx) => {
                            let content = <>
                                <span style={{ color: "#80868B" }}>{entry[0]}</span>
                                <span style={{ color: "#FFFFFF" }}>{": "}</span>
                                {processDataItem(entry[1], depth + 1, method)}
                            </>
                            return idx > 0 ?
                                <span key={idx}>
                                    <span style={{ color: "#FFFFFF" }}>{", "}</span>
                                    {content}
                                </span>
                                :
                                <span key={idx}>
                                    {content}
                                </span>
                        })
                    }
                    <span style={{ color: "#FFFFFF" }}>{" }"}</span>
                </i>
            }
            else {
                return <i style={{ color: "#FFFFFF" }}>{item.constructor.name}</i>
            }
        }
        return <span style={{ color: "#FFFFFF" }}>{item}</span>
    }

    return (
        <>
            <Modal show={consoleVisible} onHide={onConsoleHide} centered fullscreen="sm-down" contentClassName="wb-modal__container console bg-dark text-light" data-bs-theme="dark">
                <Modal.Header closeButton>
                    <div className="d-flex">
                        <Button size="sm" variant="secondary" onClick={clearConsole}>Clear</Button>
                    </div>
                </Modal.Header>
                <Modal.Body className="overflow-auto" ref={consoleRef}>
                    {
                        consoleMessages.map((item, idx) => {

                            let messageContainer = <div>
                                {
                                    item.data.map((itemData, idx) => {
                                        return <span key={idx} className="me-2" style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", wordBreak: "break-all", fontSize: "14px" }}>
                                            {processDataItem(itemData, 0, item.method)}
                                        </span>
                                    })
                                }
                            </div>

                            let leftPanelStyle = { width: item.count > 1 ? "auto" : "20px" }

                            switch (item.method) {
                                case "log": return (
                                    <div key={idx} className={"d-flex align-items-start gap-1 text-small mb-1 px-2" + (idx > 0 && consoleMessages[idx - 1].method === "log" ? " border-top" : "")}>
                                        <div className="flex-shrink-0" style={leftPanelStyle}>
                                            {
                                                item.count > 1 &&
                                                <Badge className="text-light bg-black">{item.count}</Badge>
                                            }
                                        </div>
                                        {messageContainer}
                                    </div>
                                )
                                case "warn": return (
                                    <div key={idx} style={{ background: "#413A2A" }} className="d-flex align-items-start gap-1 text-small mb-1 px-2">
                                        <div className="flex-shrink-0 text-warning" style={leftPanelStyle}>
                                            {
                                                item.count > 1 ?
                                                    <Badge className="text-black bg-warning">{item.count}</Badge>
                                                    :
                                                    <FaTriangleExclamation />
                                            }
                                        </div>
                                        {messageContainer}
                                    </div>
                                )
                                case "error": return (
                                    <div key={idx} style={{ background: "#4E3534" }} className="d-flex align-items-start gap-1 text-small mb-1 px-2">
                                        <div className="flex-shrink-0 text-danger" style={leftPanelStyle}>
                                            {
                                                item.count > 1 ?
                                                    <Badge className="text-black bg-danger">{item.count}</Badge>
                                                    :
                                                    <FaCircleXmark />
                                            }
                                        </div>
                                        {messageContainer}
                                    </div>
                                )
                                case "info": return (
                                    <div key={idx} style={{ background: "#2A3A41" }} className="d-flex align-items-start gap-1 text-small mb-1 px-2">
                                        <div className="flex-shrink-0 text-info" style={leftPanelStyle}>
                                            {
                                                item.count > 1 ?
                                                    <Badge className="text-black bg-info">{item.count}</Badge>
                                                    :
                                                    <FaCircleInfo />
                                            }
                                        </div>
                                        {messageContainer}
                                    </div>
                                )
                            }
                        })
                    }
                </Modal.Body>
            </Modal>
            {
                isCompiled === false &&
                <div className="h-100 bg-white">
                    <p>Compiling, please wait...</p>
                </div>
            }
            <div className="h-100" hidden={isCompiled === false}>
                <iframe className="wb-playground-output-web" ref={iframeRef} src="https://webler-group.github.io/web-playground/" allow="fullscreen"></iframe>
                <div className="wb-web-wrapper__frame-wrapper__console-btn">
                    <Button size="sm" variant="secondary" onClick={onConsoleShow}>Console</Button>
                </div>
            </div>
        </>
    )
}

export default WebOutput
