import React, { useRef } from "react";
import ProfileAvatar from "../../../components/ProfileAvatar";
import ProfileName from "../../../components/ProfileName";
import DateUtils from "../../../utils/DateUtils";
import PostAttachment, { IPostAttachment } from "../../discuss/components/PostAttachment";

interface IChannelMessage {
    id: string;
    type: number;
    content: string;
    userId: string;
    userName: string;
    userAvatar: string;
    createdAt: string;
    updatedAt: string;
    channelId: string;
    deleted: boolean;
    viewed: boolean;
    attachments: IPostAttachment[];
}

interface ChannelMessageProps {
    message: IChannelMessage;
    showHeader: boolean;
    onContextMenu: (message: IChannelMessage, target: HTMLElement | null) => void;
}

const ChannelMessage = React.forwardRef(({ message, showHeader, onContextMenu }: ChannelMessageProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const bodyRef = useRef<HTMLDivElement>(null);
    const touchTimer = useRef<NodeJS.Timeout | null>(null);

    // Right click handler
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (message.type !== 1 || message.deleted) return;
        onContextMenu(message, bodyRef.current);
    };

    // Mobile long press
    const handleTouchStart = () => {
        touchTimer.current = setTimeout(() => {
            if (message.type !== 1 || message.deleted) return;
            onContextMenu(message, bodyRef.current);
        }, 600); // 600ms long press
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
                    <ProfileName userId={message.userId} userName={message.userName} />
                    {messageParts[1]}
                </div>
            </div>
        );
    } else {
        body = (
            <div className="d-flex">
                {showHeader && (
                    <div className="me-2 flex-shrink-0">
                        <ProfileAvatar avatarImage={message.userAvatar} size={42} />
                    </div>
                )}

                <div
                    className="flex-grow-1">
                    {showHeader && (
                        <div className="d-flex align-items-center mb-1">
                            <ProfileName userId={message.userId} userName={message.userName} />
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
                        {message.deleted ? <i className="text-muted">Message was deleted</i> : message.content}
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

    body = <div style={{ maxWidth: "720px" }}>{body}</div>;

    return (
        <div ref={ref} className="wb-channels-message">
            {body}
        </div>
    );
});

export type {
    IChannelMessage
};

export default ChannelMessage;