import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from 'react-markdown';
import remarkGfm from "remark-gfm";
import remarkBreaks from 'remark-breaks';
import { FaTimes } from 'react-icons/fa';

interface ImagePreviewProps {
    src: string;
    onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, onClose }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const currentScale = useRef<number>(1);
    const pinchState = useRef<{
        isPinching: boolean;
        initialDistance: number;
        initialScale: number;
    }>({
        isPinching: false,
        initialDistance: 0,
        initialScale: 1,
    });
    const [maxScale, setMaxScale] = useState<number>(1);
    const minScale = 1;
    const [loaded, setLoaded] = useState(false);

    const getDistance = (e: TouchEvent): number => {
        if (e.touches.length < 2) return 0;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const updateScaleLimits = () => {
        const img = imgRef.current;
        if (!img) return;
        const initialVisualScale = img.clientWidth / img.naturalWidth;
        if (initialVisualScale > 0) {
            setMaxScale(1 / initialVisualScale);
        }
    };

    useEffect(() => {
        if (loaded) {
            updateScaleLimits();
        }
    }, [loaded]);

    useEffect(() => {
        const handleResize = () => {
            updateScaleLimits();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (loaded && currentScale.current > maxScale) {
            currentScale.current = maxScale;
            const img = imgRef.current;
            if (img) {
                img.style.transform = `scale(${maxScale})`;
            }
        }
    }, [maxScale, loaded]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                pinchState.current = {
                    isPinching: true,
                    initialDistance: getDistance(e),
                    initialScale: currentScale.current,
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (pinchState.current.isPinching && e.touches.length === 2) {
                e.preventDefault();
                const distance = getDistance(e);
                if (distance > 0 && pinchState.current.initialDistance > 0) {
                    const newScale = pinchState.current.initialScale * (distance / pinchState.current.initialDistance);
                    const clamped = Math.max(minScale, Math.min(newScale, maxScale));
                    const img = imgRef.current;
                    if (img) {
                        img.style.transform = `scale(${clamped})`;
                    }
                    currentScale.current = clamped;
                }
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                pinchState.current.isPinching = false;
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [maxScale]);

    return (
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
                zIndex: 9999,
                touchAction: "none",
            }}
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
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
                    zIndex: 10,
                }}
            >
                <FaTimes />
            </button>

            <img
                ref={imgRef}
                src={src}
                alt=""
                style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    transform: `scale(${currentScale.current})`,
                    transformOrigin: "center",
                }}
                onClick={(e) => e.stopPropagation()}
                onLoad={() => setLoaded(true)}
            />
        </div>
    );
};

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