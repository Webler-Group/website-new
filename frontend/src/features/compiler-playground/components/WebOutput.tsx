import { useEffect, useState } from "react"
import { Button, Modal } from "react-bootstrap";

interface WebOutputProps {
    source: string;
    cssSource: string;
    jsSource: string;
    tabOpen: boolean;
}

const WebOutput = ({ source, cssSource, jsSource, tabOpen }: WebOutputProps) => {

    const [consoleVisible, setConsoleVisible] = useState(false);
    const [consoleMessages, setConsoleLogs] = useState<{ message: string | null; type: number; }[]>([]);
    const [output, setOutput] = useState("");

    useEffect(() => {
        const callback: (this: Window, ev: MessageEvent<any>) => void = function (response: any) {
            if (response.data && response.data.source === "iframe") {
                switch (response.data.type) {
                    case 1: case 2: case 3: case 4:
                        if (response.data.message) {
                            setConsoleLogs(logs => [...logs, { message: response.data.message, type: response.data.type }])
                        }
                        break;
                    case 5:
                        setConsoleLogs([])
                        break;
                }
            }
        }
        window.addEventListener("message", callback);
        return () => window.removeEventListener("message", callback);
    }, []);

    useEffect(() => {
        if (tabOpen) {
            setOutput(genOutput())
        }
    }, [tabOpen]);

    useEffect(() => {
        setConsoleLogs([]);
    }, [output])

    const genOutput = () => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(source, "text/html");

        const head = doc.head || doc.getElementsByTagName('head')[0];
        const body = doc.body || doc.getElementsByTagName('body')[0];

        const style = document.createElement("style");
        style.appendChild(document.createTextNode(cssSource));
        head.appendChild(style);

        const stdoutScript = document.createElement("script");
        stdoutScript.text = `const _log = console.log;
console.log = function(...args) {
    window.parent.postMessage(
        {
            source: "iframe",
            message: args.join(" "),
            type: 1
        },
        "*"
    );
}
console.warn = function(...args) {
    window.parent.postMessage(
        {
            source: "iframe",
            message: args.join(" "),
            type: 2
        },
        "*"
    );
}
console.error = function(...args) {
    window.parent.postMessage(
        {
            source: "iframe",
            message: args.join(" "),
            type: 3
        },
        "*"
    );
}
console.info = function(...args) {
    window.parent.postMessage(
        {
            source: "iframe",
            message: args.join(" "),
            type: 4
        },
        "*"
    );
}
console.debug = function(...args) {
    window.parent.postMessage(
        {
            source: "iframe",
            message: args.join(" "),
            type: 1
        },
        "*"
    );
}
console.assert = function(assertion, ...args) {
    window.parent.postMessage(
        {
            source: "iframe",
            message: assertion ? null : args.jsoin(" "),
            type: 3
        },
        "*"
    );
}
console.clear = function() {
    window.parent.postMessage(
        {
            source: "iframe",
            message: null,
            type: 5
        },
        "*"
    );
}
window.onerror = function(message, url, line, column) {
    console.error("[" + line + ":" + column + "] " + message);
}`;
        const firstScript = head.getElementsByClassName("script")[0];
        if (firstScript) {
            head.insertBefore(firstScript, stdoutScript);
        }
        else {
            head.appendChild(stdoutScript)
        }

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

    return (
        <>
            <Modal show={consoleVisible} onHide={onConsoleHide} centered fullscreen="sm-down" contentClassName="wb-modal__container console bg-dark text-light" data-bs-theme="dark">
                <Modal.Header closeButton>
                    <div className="d-flex">
                        <b>Console</b>
                    </div>
                </Modal.Header>
                <Modal.Body className="overflow-auto">
                    {
                        consoleMessages.map((item, idx) => {
                            let colorClass = "";
                            switch (item.type) {
                                case 1:
                                    colorClass = "text-light";
                                    break;
                                case 2:
                                    colorClass = "text-warning";
                                    break;
                                case 3:
                                    colorClass = "text-danger";
                                    break;
                                case 4:
                                    colorClass = "text-info";
                            }
                            return (<div className={"border-bottom text-small p-1 " + colorClass} key={idx}>{item.message}</div>)
                        })
                    }
                </Modal.Body>
            </Modal>
            <iframe width="100%" height="100%" srcDoc={output}></iframe>
            <div className="wb-web-wrapper__frame-wrapper__console-btn">
                <Button variant="secondary" onClick={onConsoleShow}>Console</Button>
            </div>
        </>
    )
}

export default WebOutput