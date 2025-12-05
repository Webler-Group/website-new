import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from 'react-markdown';
import remarkGfm from "remark-gfm";
import ImagePreview from './ImagePreview';
import { Link } from 'react-router-dom';
import "./MarkdownRenderer.css";
import remarkBreaks from 'remark-breaks';

interface MarkdownRendererProps {
    content: string;
    allowedUrls?: (string | RegExp)[];
}

const MarkdownRenderer = ({ content, allowedUrls = [] }: MarkdownRendererProps) => {
    const [preview, setPreview] = useState<null | { src: string; alt?: string; }>(null);

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
                        onClick={() => {
                            setPreview(src ? { src, alt } : null);
                        }}
                    />
                );
            }
            return <span>{alt || "Image not allowed"}</span>;
        }
    };

    return (
        <div className='wb-markdown'>
            {preview && (
                <ImagePreview src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />
            )}
            <ReactMarkdown
                components={components}
                remarkPlugins={[remarkGfm, remarkBreaks]}
            >
                {transformedContent}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;