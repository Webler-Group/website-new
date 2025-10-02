import { useEffect, useRef, useState } from "react"
import { Badge, Button, Modal } from "react-bootstrap";
import { FaCircleInfo, FaCircleXmark, FaTriangleExclamation } from "react-icons/fa6";

interface WebOutputProps {
    source: string;
    cssSource: string;
    jsSource: string;
    tabOpen: boolean;
    consoleVisible: boolean;
    hideConosole: () => void;
    setLogsCount: (setter: (prev: number) => number) => void;
}

const WebOutput = ({ source, cssSource, jsSource, tabOpen, consoleVisible, hideConosole, setLogsCount }: WebOutputProps) => {

    const [consoleMessages, setConsoleLogs] = useState<{ data: any[]; method: string; count: number }[]>([]);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const consoleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const callback = function (response: any) {
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
                        setLogsCount(prev => prev + 1);
                }
            }
        }
        window.addEventListener("message", callback);
        return () => window.removeEventListener("message", callback);
    }, []);

    useEffect(() => {
        clearConsole();
        if (iframeRef.current) {
            if (tabOpen) {
                const output = genOutput();
                iframeRef.current.srcdoc = output;
            } else {
                iframeRef.current.srcdoc = "<!DOCTYPE HTML><html><head></head><body></body></html>";
            }
        }
    }, [tabOpen]);

    const clearConsole = () => {
        setConsoleLogs(() => []);
        setLogsCount(() => 0);
    }

    const genOutput = () => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(source, "text/html");

        const head = doc.head || doc.getElementsByTagName('head')[0];
        const body = doc.body || doc.getElementsByTagName('body')[0];

        // Inject CSS
        const style = document.createElement("style");
        style.appendChild(document.createTextNode(cssSource));
        head.appendChild(style);

        // Inject console override script BEFORE user scripts
        const consoleOverrideScript = document.createElement("script");
        consoleOverrideScript.text = `
      (function () {
        function processPayload(item) {
            if (typeof item === "function") {
                return { __type: "function", __name: item.name };
            }
            if (typeof item === "symbol") {
                return { __type: "symbol", __description: item.description }
            }
            if (typeof item === "object") {
                if (item === null) return null;

                if (Array.isArray(item)) {
                    let arr = [];
                    for (let elem of item) {
                        arr.push(processPayload(elem));
                    }
                    return arr;
                }
                if(item.constructor.name === "Date" || item.constructor.name === "RegExp") {
                    return item;
                }
                if (item.constructor.name === "Object") {
                    let obj = {};
                    for (let entry of Object.entries(item)) {
                        obj[entry[0]] = processPayload(entry[1]);
                    }
                    return obj;
                }
                return { __type: "object", __constructor: item.constructor.name };
            }
            return item;
        }

        const pushToConsole = (payload, type) => {
            window.parent.postMessage({
                console: {
                    data: processPayload(payload),
                    method: type
                }
            }, "*");
        }

        let console = (function(systemConsole) {
            return {
                log(...args) {
                    pushToConsole(args, "log");
                    systemConsole.log.apply(this, args);
                },
                info(...args) {
                    pushToConsole(args, "info");
                    systemConsole.info.apply(this, args);
                },
                warn(...args) {
                    pushToConsole(args, "warn");
                    systemConsole.warn.apply(this, args);
                },
                error(...args) {
                    pushToConsole(args, "error");
                    systemConsole.error.apply(this, args);
                },
                clear: function () {
                    pushToConsole([], "clear");
                    systemConsole.clear.apply(this, {});
                },
                time: function (...args) {
                    systemConsole.time.apply(this, args);
                }
            };
        })(window.console);
        window.console = { ...window.console, ...console };

        window.onerror = function (message, source, lineno, colno, error) {
            pushToConsole([message], "error");
        }
        window.addEventListener("unhandledrejection", function (event) {
            pushToConsole([event.reason?.message ?? event.reason], "error");
        });
        if ("gpu" in navigator) {
            const origRequestAdapter = navigator.gpu.requestAdapter;
            navigator.gpu.requestAdapter = async function (...args) {
                const adapter = await origRequestAdapter.apply(this, args);
                if (!adapter) return adapter;

                const origRequestDevice = adapter.requestDevice;
                adapter.requestDevice = async function (...args) {
                    const device = await origRequestDevice.apply(this, args);

                    device.onuncapturederror = (event) => {
                        pushToConsole([event.error.message], "error");
                    };

                    return device;
                };

                return adapter;
            };
        }
      })();
    `;
        head.insertBefore(consoleOverrideScript, head.firstChild);

        // Inject user JS
        const script = document.createElement("script");
        script.text = jsSource;
        body.appendChild(script);

        return '<!DOCTYPE HTML>\n' + doc.documentElement.outerHTML;
    };

    const processDataItem = (item: any, depth: number, method: string) => {
        if (typeof item === "undefined") {
            return <span style={{ color: "gray" }}>{"undefined"}</span>
        }
        if (typeof item === "bigint") {
            return <span style={{ color: "forestgreen" }}>{item + "n"}</span>
        }
        if (typeof item === "number" || typeof item === "boolean") {
            return <span style={{ color: "forestgreen" }}>{item.toString()}</span>
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
                return item.length > 0 ? 
                    <span className={textColorClass}>{item}</span> : 
                    <i className={textColorClass}>&lt;empty string&gt;</i>
            }
            return <span style={{ color: "violet" }}>{`"${item}"`}</span>
        }
        if (typeof item === "object") {
            if (item === null) {
                return <span style={{ color: "gray" }}>{"null"}</span>
            }
            if (item.__type === "function") {
                return <>
                    <span style={{ color: "orange" }}>{"f "}</span>
                    <span style={{ color: "orange" }}>{item.__name}</span>
                </>
            }
            if (item.__type === "symbol") {
                let description = typeof item.__description === "undefined" ? "" : `"${item.__description}"`;
                return <span style={{ color: "violet" }}>{`Symbol(${description})`}</span>
            }
            if (item instanceof Date) {
                return <>
                    <span style={{ color: "dodgerblue" }}>Date </span>
                    <span style={{ color: "violet" }}>{item.toString()}</span>
                </>
            }
            if (item instanceof Array) {
                return <>
                    <span style={{ color: "dodgerblue" }}>{"["}</span>
                    {
                        item.map((elem, idx) => {
                            return idx > 0 ?
                                <span key={idx}>
                                    <span style={{ color: "white" }}>{", "}</span>
                                    {processDataItem(elem, depth + 1, method)}
                                </span>
                                :
                                <span key={idx}>{processDataItem(elem, depth + 1, method)}</span>
                        })
                    }
                    <span style={{ color: "dodgerblue" }}>{"]"}</span>
                </>
            }
            if (item instanceof RegExp) {
                return <span style={{ color: "dodgerblue" }}>{`${item.toString()}`}</span>
            }
            if (item.__type == "object") {
                return <i style={{ color: "dodgerblue" }}>{item.__constructor}</i>
            }
            return (<>
                <span style={{ color: "dodgerblue" }}>{"{ "}</span>
                {
                    Object.entries(item).map((entry, idx) => {
                        let content = <>
                            <span style={{ color: "dodgerblue" }}>{entry[0]}</span>
                            <span style={{ color: "gray" }}>{": "}</span>
                            {processDataItem(entry[1], depth + 1, method)}
                        </>
                        return idx > 0 ?
                            <span key={idx}>
                                <span style={{ color: "dodgerblue" }}>{", "}</span>
                                {content}
                            </span>
                            :
                            <span key={idx}>
                                {content}
                            </span>
                    })
                }
                <span style={{ color: "dodgerblue" }}>{" }"}</span>
            </>);
        }
        return <span style={{ color: "white" }}>{item}</span>
    }

    return (
        <>
            <Modal show={consoleVisible} onHide={hideConosole} centered fullscreen="sm-down" contentClassName="wb-modal__container console bg-dark text-light" data-bs-theme="dark">
                <Modal.Header closeButton>
                    <div className="d-flex">
                        <Button size="sm" variant="secondary" onClick={clearConsole}>Clear</Button>
                    </div>
                </Modal.Header>
                <Modal.Body className="overflow-auto" style={{ fontFamily: "monospace" }} ref={consoleRef}>
                    {
                        consoleMessages.map((item, idx) => {

                            let messageContainer = <div>
                                {
                                    item.data.map((itemData, idx) => {
                                        return <span key={idx} className="me-2" style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", wordBreak: "break-all", fontSize: "0.85rem" }}>
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
            <div className="h-100">
                <iframe className="wb-compiler-playground-output-web" ref={iframeRef} allow="fullscreen" sandbox="allow-scripts allow-modals"></iframe>
            </div>
        </>
    )
}

export default WebOutput