import { useEffect, useRef, useState } from "react"
import { Button, Modal } from "react-bootstrap";

interface WebOutputProps {
    source: string;
    cssSource: string;
    jsSource: string;
    tabOpen: boolean;
}

const WebOutput = ({ source, cssSource, jsSource, tabOpen }: WebOutputProps) => {

    const [consoleVisible, setConsoleVisible] = useState(false);
    const [consoleMessages, setConsoleLogs] = useState<{ message: string; method: string; }[]>([]);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const callback: (this: Window, ev: MessageEvent<any>) => void = function (response: any) {
            console.log(response);
            if (response.data && response.data.console) {
                const console = response.data.console;
                switch (console.method) {
                    case "clear":
                        setConsoleLogs([]);
                        break;
                    default:
                        setConsoleLogs(logs => [...logs, { message: console.data.join(" "), method: console.method }]);
                }
            }
        }
        window.addEventListener("message", callback);
        return () => window.removeEventListener("message", callback);
    }, []);

    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            if (tabOpen) {

                const output = genOutput()
                setConsoleLogs([]);
                iframeRef.current.contentWindow.postMessage(output, "*");
            }
            else {
                iframeRef.current.contentWindow.postMessage("", "*");
            }
        }
    }, [tabOpen]);

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
                            switch (item.method) {
                                case "log":
                                    colorClass = "text-light";
                                    break;
                                case "warn":
                                    colorClass = "text-warning";
                                    break;
                                case "error":
                                    colorClass = "text-danger";
                                    break;
                                case "info":
                                    colorClass = "text-info";
                            }
                            return (<div className={"border-bottom text-small p-1 " + colorClass} key={idx}>{item.message}</div>)
                        })
                    }
                </Modal.Body>
            </Modal>
            <iframe className="wb-playground-output-web" ref={iframeRef} src="https://webler-group.github.io/web-playground/"></iframe>
            <div className="wb-web-wrapper__frame-wrapper__console-btn">
                <Button variant="secondary" onClick={onConsoleShow}>Console</Button>
            </div>
        </>
    )
}

export default WebOutput