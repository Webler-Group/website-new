import { Badge, Button, cx, Modal } from "../../../components/ui";
import React, { memo, useCallback, useEffect, useRef, useState } from "react"
import { FaCircleInfo, FaCircleXmark, FaTriangleExclamation } from "react-icons/fa6";

interface WebOutputProps {
    source: string;
    cssSource: string;
    jsSource: string;
    tabOpen: boolean;
    consoleVisible?: boolean;
    hideConosole?: () => void;
    setLogsCount?: (setter: (prev: number) => number) => void;
    // Called with a JS tab line when a message location is clicked
    onLocationClick?: (line: number) => void;
}

interface ConsoleMessage {
    data: any[];
    method: string;
    // Line in the JS tab the message originated from, if known.
    line?: number;
}

interface ConsoleEntry extends ConsoleMessage {
    id: number;
    count: number;
}

interface ConsoleState {
    entries: ConsoleEntry[];
    discarded: number;
}

// Maximum number of rendered console rows; older rows are discarded.
const MAX_CONSOLE_ENTRIES = 500;

const EMPTY_CONSOLE: ConsoleState = { entries: [], discarded: 0 };

const isSameMessage = (entry: ConsoleEntry, msg: ConsoleMessage) =>
    entry.method === msg.method &&
    entry.line === msg.line &&
    entry.data.length === msg.data.length &&
    entry.data.every((item, i) => item === msg.data[i]);

// Script injected into the iframe before any user code. It forwards console
// calls, uncaught errors and WebGL/WebGPU errors to the parent window.
const consoleOverrideSource = `
(function () {
    var MAX_DEPTH = 6;
    // Filled in by the parent: document line where the JS tab code starts and its line count.
    var USER_JS_START = /*__WEBLER_JS_START__*/0;
    var USER_JS_LINES = /*__WEBLER_JS_LINES__*/0;

    function toUserLine(docLine) {
        docLine = Number(docLine);
        if (!USER_JS_START || !(docLine >= USER_JS_START) || docLine >= USER_JS_START + USER_JS_LINES) return undefined;
        return docLine - USER_JS_START + 1;
    }

    // First stack frame that lies inside the JS tab code.
    function lineFromStack(stack) {
        if (typeof stack !== "string") return undefined;
        var re = /srcdoc:(\\d+):\\d+/g, m;
        while ((m = re.exec(stack))) {
            var line = toUserLine(m[1]);
            if (line) return line;
        }
        return undefined;
    }

    function callerLine() {
        try { return lineFromStack(new Error().stack); } catch (e) { return undefined; }
    }
    var MAX_ITEMS = 100;

    function processPayload(item, depth, seen) {
        if (typeof item === "function") {
            return { __type: "function", __name: item.name };
        }
        if (typeof item === "symbol") {
            return { __type: "symbol", __description: item.description };
        }
        if (typeof item === "object") {
            if (item === null) return null;
            if (seen.indexOf(item) !== -1) return { __type: "object", __constructor: "[Circular]" };
            var ctorName = item.constructor ? item.constructor.name : "Object";
            if (ctorName === "Date" || ctorName === "RegExp") {
                return item;
            }
            if (depth >= MAX_DEPTH) {
                return { __type: "object", __constructor: Array.isArray(item) ? "Array(" + item.length + ")" : ctorName };
            }
            seen.push(item);
            try {
                if (Array.isArray(item)) {
                    var arr = [];
                    var n = Math.min(item.length, MAX_ITEMS);
                    for (var i = 0; i < n; i++) {
                        arr.push(processPayload(item[i], depth + 1, seen));
                    }
                    if (item.length > MAX_ITEMS) arr.push({ __type: "more", __count: item.length - MAX_ITEMS });
                    return arr;
                }
                if (ctorName === "Object") {
                    var obj = {};
                    var keys = Object.keys(item);
                    var m = Math.min(keys.length, MAX_ITEMS);
                    for (var j = 0; j < m; j++) {
                        obj[keys[j]] = processPayload(item[keys[j]], depth + 1, seen);
                    }
                    if (keys.length > MAX_ITEMS) obj["…"] = { __type: "more", __count: keys.length - MAX_ITEMS };
                    return obj;
                }
                return { __type: "object", __constructor: ctorName };
            } finally {
                seen.pop();
            }
        }
        return item;
    }

    var pushToConsole = function (payload, type, line) {
        var data;
        try {
            data = processPayload(payload, 0, []);
        } catch (e) {
            data = [String(e)];
        }
        window.parent.postMessage({
            console: {
                data: data,
                method: type,
                line: line
            }
        }, "*");
    };

    var console = (function (systemConsole) {
        return {
            log: function () {
                var args = Array.prototype.slice.call(arguments);
                pushToConsole(args, "log", callerLine());
                systemConsole.log.apply(systemConsole, args);
            },
            info: function () {
                var args = Array.prototype.slice.call(arguments);
                pushToConsole(args, "info", callerLine());
                systemConsole.info.apply(systemConsole, args);
            },
            warn: function () {
                var args = Array.prototype.slice.call(arguments);
                pushToConsole(args, "warn", callerLine());
                systemConsole.warn.apply(systemConsole, args);
            },
            error: function () {
                var args = Array.prototype.slice.call(arguments);
                pushToConsole(args, "error", callerLine());
                systemConsole.error.apply(systemConsole, args);
            },
            clear: function () {
                pushToConsole([], "clear");
                systemConsole.clear.apply(systemConsole);
            },
            time: function () {
                systemConsole.time.apply(systemConsole, arguments);
            }
        };
    })(window.console);
    window.console = Object.assign({}, window.console, console);

    window.onerror = function (message, source, lineno, colno, error) {
        var line = toUserLine(lineno) || lineFromStack(error && error.stack);
        pushToConsole([message], "error", line);
    };
    window.addEventListener("unhandledrejection", function (event) {
        var reason = event.reason;
        pushToConsole([reason && reason.message !== undefined ? reason.message : reason], "error", lineFromStack(reason && reason.stack));
    });

    // ---- WebGL error reporting ----
    // Browsers print WebGL errors straight to devtools without going through
    // console.*, so poll gl.getError() and report what it returns.
    // Checking after every call forces a GPU sync, so it is only done for a
    // limited number of calls (setup code, and right after an error was seen);
    // otherwise errors are checked once per animation frame / interval.
    (function () {
        var GL_ERRORS = {
            0x0500: "INVALID_ENUM",
            0x0501: "INVALID_VALUE",
            0x0502: "INVALID_OPERATION",
            0x0505: "OUT_OF_MEMORY",
            0x0506: "INVALID_FRAMEBUFFER_OPERATION",
            0x9242: "CONTEXT_LOST_WEBGL"
        };
        var MAX_REPORTED = 32;
        var PER_CALL_BUDGET = 2000;
        var contexts = [];

        function instrument(gl) {
            if (gl.__weblerInstrumented) return;
            Object.defineProperty(gl, "__weblerInstrumented", { value: true });

            var nativeGetError = gl.getError;
            var pending = [];
            var reported = 0;
            var budget = PER_CALL_BUDGET;
            var wrappedKeys = [];
            var state = { done: false };

            function log(code, fname, line) {
                if (reported >= MAX_REPORTED) return;
                reported++;
                var name = GL_ERRORS[code] || ("0x" + code.toString(16));
                pushToConsole(["WebGL: " + name + (fname ? ": " + fname : "")], "error", line);
                if (reported >= MAX_REPORTED) {
                    pushToConsole(["WebGL: too many errors, no more errors will be reported to the console for this context."], "warn");
                    uninstrument();
                }
            }

            // Pull errors from the driver; keep them so user getError() still sees them.
            function drain(fname) {
                var found = false;
                for (var i = 0; i < 8; i++) {
                    var code = nativeGetError.call(gl);
                    if (!code) break;
                    found = true;
                    if (pending.indexOf(code) === -1) pending.push(code);
                    log(code, fname, fname ? callerLine() : undefined);
                }
                return found;
            }

            function uninstrument() {
                state.done = true;
                // Restore prototype methods so there is no overhead anymore.
                for (var i = 0; i < wrappedKeys.length; i++) delete gl[wrappedKeys[i]];
                wrappedKeys = [];
            }

            var keys = [];
            for (var proto = Object.getPrototypeOf(gl); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
                var names = Object.getOwnPropertyNames(proto);
                for (var k = 0; k < names.length; k++) {
                    if (keys.indexOf(names[k]) === -1) keys.push(names[k]);
                }
            }
            for (var ki = 0; ki < keys.length; ki++) {
                var key = keys[ki];
                if (key === "getError" || key === "constructor") continue;
                var desc = null;
                for (var p = Object.getPrototypeOf(gl); p && !desc; p = Object.getPrototypeOf(p)) {
                    desc = Object.getOwnPropertyDescriptor(p, key);
                }
                // Only wrap plain methods; skip accessors like drawingBufferWidth.
                if (!desc || typeof desc.value !== "function") continue;
                var value = desc.value;
                (function (name, orig) {
                    gl[name] = function () {
                        var result = orig.apply(this, arguments);
                        if (budget > 0) {
                            budget--;
                            drain(name);
                        }
                        return result;
                    };
                    wrappedKeys.push(name);
                })(key, value);
            }

            gl.getError = function () {
                if (pending.length) return pending.shift();
                var code = nativeGetError.call(gl);
                if (code && !state.done) log(code, null, callerLine());
                return code;
            };

            contexts.push({
                state: state,
                check: function () {
                    // Error found at frame level: check the following calls
                    // individually to find out which function caused it.
                    if (drain(null)) budget = PER_CALL_BUDGET;
                }
            });
        }

        function checkAll() {
            for (var i = contexts.length - 1; i >= 0; i--) {
                if (contexts[i].state.done) {
                    contexts.splice(i, 1);
                    continue;
                }
                try { contexts[i].check(); } catch (e) {}
            }
        }

        function hookGetContext(proto) {
            if (!proto || !proto.getContext) return;
            var origGetContext = proto.getContext;
            proto.getContext = function (type) {
                var ctx = origGetContext.apply(this, arguments);
                if (ctx && /^(webgl2?|experimental-webgl)$/.test(type)) {
                    try { instrument(ctx); } catch (e) {}
                }
                return ctx;
            };
        }
        hookGetContext(window.HTMLCanvasElement && HTMLCanvasElement.prototype);
        hookGetContext(window.OffscreenCanvas && OffscreenCanvas.prototype);

        var origRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function (callback) {
            return origRAF.call(window, function (time) {
                try {
                    callback(time);
                } finally {
                    if (contexts.length) checkAll();
                }
            });
        };
        setInterval(function () {
            if (contexts.length) checkAll();
        }, 500);
    })();

    if ("gpu" in navigator) {
        var origRequestAdapter = navigator.gpu.requestAdapter;
        navigator.gpu.requestAdapter = async function () {
            var adapter = await origRequestAdapter.apply(this, arguments);
            if (!adapter) return adapter;

            var origRequestDevice = adapter.requestDevice;
            adapter.requestDevice = async function () {
                var device = await origRequestDevice.apply(this, arguments);

                device.onuncapturederror = function (event) {
                    pushToConsole([event.error.message], "error");
                };

                return device;
            };

            return adapter;
        };
    }
})();
`;

const processDataItem = (item: any, depth: number, method: string): React.ReactNode => {
    if (typeof item === "undefined") {
        return <span className="wb-compiler-playground-console-token--muted">{"undefined"}</span>
    }
    if (typeof item === "bigint") {
        return <span className="wb-compiler-playground-console-token--number">{item + "n"}</span>
    }
    if (typeof item === "number" || typeof item === "boolean") {
        return <span className="wb-compiler-playground-console-token--number">{item.toString()}</span>
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
        return <span className="wb-compiler-playground-console-token--string">{`"${item}"`}</span>
    }
    if (typeof item === "object") {
        if (item === null) {
            return <span className="wb-compiler-playground-console-token--muted">{"null"}</span>
        }
        if (item.__type === "function") {
            return <>
                <span className="wb-compiler-playground-console-token--function">{"f "}</span>
                <span className="wb-compiler-playground-console-token--function">{item.__name}</span>
            </>
        }
        if (item.__type === "symbol") {
            let description = typeof item.__description === "undefined" ? "" : `"${item.__description}"`;
            return <span className="wb-compiler-playground-console-token--string">{`Symbol(${description})`}</span>
        }
        if (item.__type === "more") {
            return <i className="wb-compiler-playground-console-token--muted">{`… ${item.__count} more`}</i>
        }
        if (item instanceof Date) {
            return <>
                <span className="wb-compiler-playground-console-token--structure">Date </span>
                <span className="wb-compiler-playground-console-token--string">{item.toString()}</span>
            </>
        }
        if (item instanceof Array) {
            return <>
                <span className="wb-compiler-playground-console-token--structure">{"["}</span>
                {
                    item.map((elem, idx) => {
                        return idx > 0 ?
                            <span key={idx}>
                                <span className="wb-compiler-playground-console-token--plain">{", "}</span>
                                {processDataItem(elem, depth + 1, method)}
                            </span>
                            :
                            <span key={idx}>{processDataItem(elem, depth + 1, method)}</span>
                    })
                }
                <span className="wb-compiler-playground-console-token--structure">{"]"}</span>
            </>
        }
        if (item instanceof RegExp) {
            return <span className="wb-compiler-playground-console-token--structure">{`${item.toString()}`}</span>
        }
        if (item.__type == "object") {
            return <i className="wb-compiler-playground-console-token--structure">{item.__constructor}</i>
        }
        return (<>
            <span className="wb-compiler-playground-console-token--structure">{"{ "}</span>
            {
                Object.entries(item).map((entry, idx) => {
                    let content = <>
                        <span className="wb-compiler-playground-console-token--structure">{entry[0]}</span>
                        <span className="wb-compiler-playground-console-token--muted">{": "}</span>
                        {processDataItem(entry[1], depth + 1, method)}
                    </>
                    return idx > 0 ?
                        <span key={idx}>
                            <span className="wb-compiler-playground-console-token--structure">{", "}</span>
                            {content}
                        </span>
                        :
                        <span key={idx}>
                            {content}
                        </span>
                })
            }
            <span className="wb-compiler-playground-console-token--structure">{" }"}</span>
        </>);
    }
    return <span className="wb-compiler-playground-console-token--plain">{item}</span>
}

// Memoized so that appending a message only renders the new row(s).
const ConsoleRow = memo(({ entry, borderTop, onLocationClick }: { entry: ConsoleEntry; borderTop: boolean; onLocationClick?: (line: number) => void }) => {
    const messageContainer = <div className="flex-grow-1 wb-util-min-w-0">
        {
            entry.data.map((itemData, idx) => (
                <span key={idx} className="wb-compiler-playground-console-data me-2">
                    {processDataItem(itemData, 0, entry.method)}
                </span>
            ))
        }
    </div>

    const location = entry.line !== undefined &&
        <button
            type="button"
            className="wb-compiler-playground-console-location flex-shrink-0 ms-2 p-0 border-0 bg-transparent text-secondary text-decoration-underline"
            title={`Go to line ${entry.line} in the JS tab`}
            disabled={!onLocationClick}
            onClick={() => onLocationClick?.(entry.line!)}
        >
            JS:{entry.line}
        </button>

    const iconClass = cx("wb-compiler-playground-console-icon flex-shrink-0", entry.count > 1 && "wb-compiler-playground-console-icon--count");

    switch (entry.method) {
        case "warn": return (
            <div className="wb-compiler-playground-console-row--warn d-flex align-items-start gap-1 text-small mb-1 px-2">
                <div className={cx(iconClass, "text-warning")}>
                    {entry.count > 1 ? <Badge className="text-black bg-warning">{entry.count}</Badge> : <FaTriangleExclamation />}
                </div>
                {messageContainer}
                {location}
            </div>
        )
        case "error": return (
            <div className="wb-compiler-playground-console-row--error d-flex align-items-start gap-1 text-small mb-1 px-2">
                <div className={cx(iconClass, "text-danger")}>
                    {entry.count > 1 ? <Badge className="text-black bg-danger">{entry.count}</Badge> : <FaCircleXmark />}
                </div>
                {messageContainer}
                {location}
            </div>
        )
        case "info": return (
            <div className="wb-compiler-playground-console-row--info d-flex align-items-start gap-1 text-small mb-1 px-2">
                <div className={cx(iconClass, "text-info")}>
                    {entry.count > 1 ? <Badge className="text-black bg-info">{entry.count}</Badge> : <FaCircleInfo />}
                </div>
                {messageContainer}
                {location}
            </div>
        )
        default: return (
            <div className={"d-flex align-items-start gap-1 text-small mb-1 px-2" + (borderTop ? " border-top" : "")}>
                <div className={iconClass}>
                    {entry.count > 1 && <Badge className="text-light bg-black">{entry.count}</Badge>}
                </div>
                {messageContainer}
                {location}
            </div>
        )
    }
});

const WebOutput = ({ source, cssSource, jsSource, tabOpen, consoleVisible, hideConosole, setLogsCount, onLocationClick }: WebOutputProps) => {

    const [consoleState, setConsoleState] = useState<ConsoleState>(EMPTY_CONSOLE);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const consoleRef = useRef<HTMLDivElement>(null);
    const queueRef = useRef<ConsoleMessage[]>([]);
    const flushHandleRef = useRef<number | null>(null);
    const nextIdRef = useRef(0);
    const setLogsCountRef = useRef(setLogsCount);
    setLogsCountRef.current = setLogsCount;
    // Stable callback so memoized rows don't re-render when the parent's callback changes
    const onLocationClickRef = useRef(onLocationClick);
    onLocationClickRef.current = onLocationClick;
    const handleLocationClick = useCallback((line: number) => onLocationClickRef.current?.(line), []);

    // Messages are queued and applied at most once per frame, so a flood of
    // logs causes a single state update instead of one render per message.
    const flushQueue = () => {
        flushHandleRef.current = null;
        const batch = queueRef.current;
        queueRef.current = [];
        if (batch.length === 0) return;

        let lastClear = -1;
        for (let i = 0; i < batch.length; i++) {
            if (batch[i].method === "clear") lastClear = i;
        }
        const pending = lastClear === -1 ? batch : batch.slice(lastClear + 1);

        // Assign ids outside of the state updater to keep it pure.
        const startId = nextIdRef.current;
        nextIdRef.current += pending.length;

        setConsoleState(prev => {
            const entries = lastClear === -1 ? prev.entries.slice() : [];
            let discarded = lastClear === -1 ? prev.discarded : 0;
            pending.forEach((msg, i) => {
                const last = entries[entries.length - 1];
                if (last && isSameMessage(last, msg)) {
                    entries[entries.length - 1] = { ...last, count: last.count + 1 };
                } else {
                    entries.push({ ...msg, id: startId + i, count: 1 });
                }
            });
            if (entries.length > MAX_CONSOLE_ENTRIES) {
                const overflow = entries.length - MAX_CONSOLE_ENTRIES;
                entries.splice(0, overflow);
                discarded += overflow;
            }
            return { entries, discarded };
        });

        if (lastClear === -1) {
            setLogsCountRef.current?.(prev => prev + pending.length);
        } else {
            setLogsCountRef.current?.(() => pending.length);
        }
    }

    const cancelFlush = () => {
        if (flushHandleRef.current !== null) {
            cancelAnimationFrame(flushHandleRef.current);
            flushHandleRef.current = null;
        }
    }

    useEffect(() => {
        const callback = function (response: MessageEvent) {
            if (response.source !== iframeRef.current?.contentWindow) return;
            const msg = response.data?.console;
            if (!msg) return;
            queueRef.current.push({
                data: Array.isArray(msg.data) ? msg.data : [msg.data],
                method: msg.method,
                line: typeof msg.line === "number" ? msg.line : undefined
            });
            if (flushHandleRef.current === null) {
                flushHandleRef.current = requestAnimationFrame(flushQueue);
            }
        }
        window.addEventListener("message", callback);
        return () => {
            window.removeEventListener("message", callback);
            cancelFlush();
        };
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
        cancelFlush();
        queueRef.current = [];
        setConsoleState(EMPTY_CONSOLE);
        setLogsCount?.(() => 0);
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
        consoleOverrideScript.text = consoleOverrideSource;
        head.insertBefore(consoleOverrideScript, head.firstChild);

        // Inject user JS
        const script = document.createElement("script");
        script.text = jsSource;
        body.appendChild(script);

        let output = '<!DOCTYPE HTML>\n' + doc.documentElement.outerHTML;

        // Tell the console script where the JS tab code sits in the document so
        // stack trace lines can be mapped back to JS tab lines. Placeholders are
        // replaced on the same line, so line numbers don't shift.
        const jsIndex = jsSource.length > 0 ? output.lastIndexOf(jsSource) : -1;
        if (jsIndex !== -1) {
            let startLine = 1;
            for (let i = 0; i < jsIndex; i++) {
                if (output.charCodeAt(i) === 10) startLine++;
            }
            const lineCount = jsSource.split("\n").length;
            output = output
                .replace("/*__WEBLER_JS_START__*/0", String(startLine))
                .replace("/*__WEBLER_JS_LINES__*/0", String(lineCount));
        }
        return output;
    };

    const { entries, discarded } = consoleState;

    return (
        <>
            <Modal show={consoleVisible} onHide={hideConosole} centered fullscreen="sm-down" contentClassName="wb-app-modal-content-console bg-dark text-light" data-bs-theme="dark">
                <Modal.Header closeButton>
                    <div className="d-flex">
                        <Button size="sm" variant="secondary" onClick={clearConsole}>Clear</Button>
                    </div>
                </Modal.Header>
                <Modal.Body className="overflow-auto font-monospace" ref={consoleRef}>
                    {
                        discarded > 0 &&
                        <div className="wb-compiler-playground-console-discarded text-secondary fst-italic px-2 mb-1">
                            {discarded} older {discarded === 1 ? "message was" : "messages were"} discarded
                        </div>
                    }
                    {
                        entries.map((entry, idx) => (
                            <ConsoleRow
                                key={entry.id}
                                entry={entry}
                                borderTop={entry.method === "log" && idx > 0 && entries[idx - 1].method === "log"}
                                onLocationClick={onLocationClick ? handleLocationClick : undefined}
                            />
                        ))
                    }
                </Modal.Body>
            </Modal>
            <div className="h-100">
                <iframe className="wb-compiler-playground-output-web" ref={iframeRef} allow="fullscreen" sandbox="allow-scripts allow-modals allow-popups"></iframe>
            </div>
        </>
    )
}

export default WebOutput
