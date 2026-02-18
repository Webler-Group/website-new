import "./HtmlRenderer.css";

interface HtmlRendererProps {
    html: string;
}

export default function HtmlRenderer({ html }: HtmlRendererProps) {
    return (
        <div
            className="html-renderer"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
