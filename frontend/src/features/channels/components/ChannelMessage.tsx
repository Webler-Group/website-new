import React, { JSX, useRef } from "react";
import ProfileAvatar from "../../../components/ProfileAvatar";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import RepliedMessage from "./RepliedMessage";
import { ChannelMessageDetails } from "../types";
import PostAttachment from "../../../components/post-attachment-select/PostAttachment";
import ChannelMessageTypeEnum from "../../../data/ChannelMessageTypeEnum";
import { Link } from "react-router-dom";

interface ChannelMessageProps {
    message: ChannelMessageDetails;
    showHeader: boolean;
    onContextMenu: (message: ChannelMessageDetails, target: HTMLElement | null) => void;
    onImagePreview: (preview: { src: string, alt?: string } | null) => void;
}

const AVATAR_SIZE = 42;

const MEDIA_FILE_REGEX = /^\/media\/files\/[a-f0-9]+(\.[a-z0-9]+)?$/i;

const ChannelMessage = React.forwardRef(({ message, showHeader, onContextMenu, onImagePreview }: ChannelMessageProps, ref: React.ForwardedRef<HTMLDivElement>) => {
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

        const isMediaFile = (url: string): boolean => {
            const path = url.startsWith('/') ? url : toHref(url);
            return MEDIA_FILE_REGEX.test(path);
        };

        while ((match = regex.exec(message)) !== null) {
            if (match.index > lastIndex) {
                parts.push(<React.Fragment key={parts.length}>{message.substring(lastIndex, match.index)}</React.Fragment>);
            }
            const url = match[0];
            const href = toHref(url);

            if (isMediaFile(url)) {
                parts.push(
                    <img
                        key={parts.length}
                        src={href}
                        alt="Image"
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            maxHeight: '320px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            objectFit: 'cover',
                            display: 'block',
                        }}
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
        if (message.type !== ChannelMessageTypeEnum.MESSAGE || message.deleted) return;
        onContextMenu(message, bodyRef.current);
    };

    const handleTouchStart = () => {
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
                <div className="p-2 rounded text-center wb-channels-message__body">
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
                        className={`p-2 rounded wb-channels-message__body ${!showHeader ? "ms-5 indented" : ""}`}
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
                </div>
            </div>
        );
    }

    body = <div style={{ maxWidth: "720px" }}>
        {message.repliedTo &&
            <div className="ms-5 indented">
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