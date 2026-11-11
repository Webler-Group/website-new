import { cx } from "../../../components/ui";
import React, { JSX, useRef } from "react";
import ProfileAvatar from "../../../components/ProfileAvatar";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import RepliedMessage from "./RepliedMessage";
import { ChannelMessageDetails, PendingMessageStatus } from "../types";
import PostAttachment from "../../../components/post-attachment-select/PostAttachment";
import ChannelMessageTypeEnum from "../../../data/ChannelMessageTypeEnum";
import { Link } from "react-router-dom";
import { parseMediaUrl } from "../../../utils/FileUtils";
import FileAttachmentLink from "../../../components/FileAttachmentLink";

interface ChannelMessageProps {
    message: ChannelMessageDetails;
    showHeader: boolean;
    onContextMenu: (message: ChannelMessageDetails, target: HTMLElement | null) => void;
    onImagePreview: (preview: { src: string, alt?: string } | null) => void;
    /** Set for optimistic messages not yet confirmed by the server */
    pending?: {
        status: PendingMessageStatus;
        error?: string;
        onRetry: () => void;
        onCancel: () => void;
    };
}

const AVATAR_SIZE = 42;

const ChannelMessage = React.forwardRef(({ message, showHeader, onContextMenu, onImagePreview, pending }: ChannelMessageProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const bodyRef = useRef<HTMLDivElement>(null);
    const touchTimer = useRef<NodeJS.Timeout | null>(null);

    const parseMessage = (message: string) => {
        const regex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|(?<![a-zA-Z0-9])\/[a-zA-Z0-9][^\s<>"{}|\\^`[\]]*)/g;
        const parts: JSX.Element[] = [];
        let lastIndex = 0;
        let match;

        const isInternal = (url: string): boolean => {
            if (url.startsWith('/')) return true;
            try {
                return new URL(url).origin === window.location.origin;
            } catch {
                return false;
            }
        };

        const toHref = (url: string): string => {
            if (url.startsWith('/')) return url;
            try {
                const { pathname, search, hash } = new URL(url);
                return `${pathname}${search}${hash}`;
            } catch {
                return url;
            }
        };

        const getMediaInfo = (url: string) => {
            if (!isInternal(url)) return null;
            return parseMediaUrl(toHref(url));
        };

        while ((match = regex.exec(message)) !== null) {
            if (match.index > lastIndex) {
                parts.push(<React.Fragment key={parts.length}>{message.substring(lastIndex, match.index)}</React.Fragment>);
            }
            const url = match[0];
            const href = toHref(url);
            const media = getMediaInfo(url);

            if (media?.type === "file") {
                parts.push(
                    <span key={parts.length} className="d-block my-1">
                        <FileAttachmentLink url={href} name={media.name} />
                    </span>
                );
            } else if (media?.type === "image") {
                parts.push(
                    <img
                        key={parts.length}
                        src={href}
                        alt="Image"
                        className="wb-channels-message-image"
                        onClick={() => onImagePreview({ src: url, alt: "Image" })}
                    />
                );
            } else if (isInternal(url)) {
                parts.push(<Link key={parts.length} to={href}>{url}</Link>);
            } else {
                parts.push(<a key={parts.length} href={url} target="_blank" rel="noopener noreferrer">{url}</a>);
            }

            lastIndex = regex.lastIndex;
        }
        if (lastIndex < message.length) {
            parts.push(<React.Fragment key={parts.length}>{message.substring(lastIndex)}</React.Fragment>);
        }
        return parts;
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (pending) return;
        if (message.type !== ChannelMessageTypeEnum.MESSAGE || message.deleted) return;
        onContextMenu(message, bodyRef.current);
    };

    const handleTouchStart = () => {
        if (pending) return;
        touchTimer.current = setTimeout(() => {
            if (message.type !== 1 || message.deleted) return;
            onContextMenu(message, bodyRef.current);
        }, 500);
    };

    const handleTouchMove = () => {
        if (touchTimer.current) clearTimeout(touchTimer.current);
    };

    const handleTouchEnd = () => {
        if (touchTimer.current) clearTimeout(touchTimer.current);
    };

    let body;
    if (message.type !== 1) {
        const messageParts = message.content.split("{action_user}");
        body = (
            <div className="d-flex justify-content-center">
                <div className="p-2 rounded text-center wb-channels-message-body">
                    {messageParts[0]}
                    <ProfileName userId={message.user.id} userName={message.user.name} />
                    {messageParts[1]}
                </div>
            </div>
        );
    } else {
        body = (
            <div className="d-flex">
                {showHeader && (
                    <div className="me-2 flex-shrink-0">
                        <ProfileAvatar avatarUrl={message.user.avatarUrl} size={AVATAR_SIZE} />
                    </div>
                )}

                <div className="flex-grow-1">
                    {showHeader && (
                        <div className="d-flex align-items-center mb-1">
                            <ProfileName className="fw-bold" userId={message.user.id} userName={message.user.name} />
                            <small className="text-muted ms-2">
                                {DateUtils.format(new Date(message.createdAt))}
                            </small>
                        </div>
                    )}

                    <div
                        ref={bodyRef}
                        className={cx(
                            "p-2 rounded wb-channels-message-body",
                            !showHeader && "ms-5 wb-channels-message-body--indented",
                            pending && `wb-channels-message-body--${pending.status}`
                        )}
                        onContextMenu={handleContextMenu}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {message.deleted ? <i className="text-muted">Message was deleted</i> : parseMessage(message.content)}
                        {(!message.deleted && new Date(message.createdAt) < new Date(message.updatedAt)) && (
                            <small className="text-muted"> (edited)</small>
                        )}
                        {!message.deleted && (
                            <div>
                                {message.attachments.map((attachment) => (
                                    <div key={attachment.id} className="mt-2">
                                        <PostAttachment data={attachment} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {pending && (
                        <div className={`small mt-1 ${!showHeader ? "ms-5" : ""}`}>
                            {pending.status === "sending" ? (
                                <span className="text-muted">Sending…</span>
                            ) : (
                                <span className="d-inline-flex flex-wrap align-items-center gap-2">
                                    <span className="text-danger">
                                        Not sent{pending.error ? ` (${pending.error})` : ""}
                                    </span>
                                    <button type="button" className="btn btn-link btn-sm p-0" onClick={pending.onRetry}>Resend</button>
                                    <button type="button" className="btn btn-link btn-sm p-0 text-muted" onClick={pending.onCancel}>Cancel</button>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    body = <div className="wb-channels-message">
        {message.repliedTo &&
            <div className="ms-5">
                <RepliedMessage message={message.repliedTo} />
            </div>
        }
        {body}
    </div>;

    return (
        <div ref={ref} className="wb-channels-message">
            {body}
        </div>
    );
});

export default ChannelMessage;