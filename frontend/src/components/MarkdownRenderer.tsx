import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from 'react-markdown';
import remarkGfm from "remark-gfm";
import remarkBreaks from 'remark-breaks';
import ImagePreview from './ImagePreview';
import { Link } from 'react-router-dom';

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
            if (!href) {
                return <span>{children}</span>;
            }
            if (href.startsWith("/")) {
                return <Link to={href}>{children}</Link>;
            }
            const domain = "weblercodes.com";
            if (href.includes(domain)) {
                const relativePath = href.split(domain)[1] || "/";
                return <Link to={relativePath}>{children}</Link>;
            }
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
                        onClick={() => {
                            setPreviewSrc(src || null);
                        }}
                    />
                );
            }
            return <span>{alt || "Image not allowed"}</span>;
        }
    };

    return (
        <>
            {previewSrc && (
                <ImagePreview src={previewSrc} onClose={() => setPreviewSrc(null)} />
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