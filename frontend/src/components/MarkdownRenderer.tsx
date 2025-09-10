import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from 'react-markdown';
import remarkGfm from "remark-gfm";
import remarkBreaks from 'remark-breaks';
import { FaTimes } from 'react-icons/fa';

interface MarkdownRendererProps {
    content: string;
    allowedUrls?: (string | RegExp)[];
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, allowedUrls = [] }) => {
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    const isAllowedUrl = (url?: string) => {
        if (!url) return false;

        return allowedUrls.some(pattern =>
            typeof pattern === "string" ? url.startsWith(pattern) : pattern.test(url)
        );
    };

    const transformedContent = content.replace(
        /\[user id="([^"]+)"\](.*?)\[\/user\]/g,
        (_match, userId, username) => `[@${username}](/Profile/${userId})`
    );

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
                return (
                    <img
                        src={src}
                        alt={alt || ""}
                        style={{
                            maxWidth: "100%",
                            maxHeight: "240px",
                            cursor: "pointer",
                            objectFit: "cover",
                        }}
                        onClick={() => setPreviewSrc(src || null)}
                    />
                );
            }
            return <span>{alt || "Image not allowed"}</span>;
        }
    };

    return (
        <>
            {previewSrc && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0, 0, 0, 0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // prevent overlay click
                            setPreviewSrc(null);
                        }}
                        style={{
                            position: "absolute",
                            top: "20px",
                            right: "20px",
                            background: "transparent",
                            border: "none",
                            color: "#fff",
                            fontSize: "1.8rem",
                            cursor: "pointer",
                        }}
                        aria-label="Close image preview"
                    >
                        <FaTimes />
                    </button>

                    <img
                        src={previewSrc}
                        alt=""
                        style={{
                            maxWidth: "90%",
                            maxHeight: "90%",
                            objectFit: "contain",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            <ReactMarkdown
                components={components}
                remarkPlugins={[remarkGfm, remarkBreaks]}
            >
                {transformedContent}
            </ReactMarkdown>
        </>
    );
};

export default MarkdownRenderer;
