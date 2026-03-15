import { useEffect, useRef } from "react";

interface HtmlRendererProps {
    html: string;
    css?: string;
}

const BASE_STYLES = `
    body {
        margin: 0;
        padding: 0;
        overflow-wrap: break-word;
        word-break: break-word;
        box-sizing: border-box;
        font-family: inherit;
    }
    *, *::before, *::after {
        max-width: 100%;
        box-sizing: border-box;
    }
    img, video, canvas {
        max-width: 100%;
        height: auto;
    }
    table {
        width: 100%;
        overflow-x: auto;
        border-collapse: collapse;
    }
    pre, code {
        white-space: pre-wrap;
        word-break: break-word;
    }
`;

const HtmlRenderer = ({ html, css }: HtmlRendererProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!iframeRef.current) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const baseStyle = document.createElement("style");
        baseStyle.appendChild(document.createTextNode(BASE_STYLES));
        doc.head.insertBefore(baseStyle, doc.head.firstChild);

        if (css) {
            const customStyle = document.createElement("style");
            customStyle.appendChild(document.createTextNode(css));
            doc.head.appendChild(customStyle);
        }

        iframeRef.current.srcdoc = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    }, [html, css]);

    return (
        <iframe
            ref={iframeRef}
            title="HTML Preview"
            style={{ width: "100%", height: "100%", border: "none", display: "flex" }}
            sandbox=""
        />
    );
}


export default HtmlRenderer;