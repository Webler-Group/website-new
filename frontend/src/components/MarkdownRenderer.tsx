import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from 'react-markdown';
import remarkGfm from "remark-gfm";
import remarkBreaks from 'remark-breaks';

interface MarkdownRendererProps {
    content: string;
    allowedUrls?: (string | RegExp)[];
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, allowedUrls = [] }) => {
    const isAllowedUrl = (url?: string) => {
        if (!url) return false;
        
        return allowedUrls.some(pattern =>
            typeof pattern === "string" ? url.startsWith(pattern) : pattern.test(url)
        );
    };

    const components: Components = {
        code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            return match ? (
                <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={className}>
                    {children}
                </code>
            );
        },

        a({ href, children }) {
            if (isAllowedUrl(href)) {
                return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                    </a>
                );
            }
            return <span>{children}</span>;
        },

        img({ src, alt }) {
            if (isAllowedUrl(src)) {
                return <img src={src} alt={alt || ""} style={{ width: "100%", maxWidth: "480px" }} />;
            }
            return <span>{alt || "Image not allowed"}</span>;
        }
    };

    return (
        <ReactMarkdown
            components={components}
            remarkPlugins={[remarkGfm, remarkBreaks]}
        >
            {content}
        </ReactMarkdown>
    );
};

export default MarkdownRenderer;
