import React from "react";
import { IChannelMessage } from "./ChannelMessage";
import { IChannelInvite } from "./InvitesListItem";

interface IChannelParticipant {
    userId: string;
    userName: string;
    userAvatar: string;
    role: string;
}

interface IChannel {
    id: string;
    type: number;
    coverImage: string;
    title: string;
    lastMessage?: IChannelMessage;
    invites?: IChannelInvite[];
    participants?: IChannelParticipant[];
}

interface ChannelListItemProps {
    channel: IChannel;
    onClick: () => void;
}

const ChannelListItem = React.forwardRef(({ channel, onClick }: ChannelListItemProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { coverImage, title, lastMessage } = channel;

    let body = (
        <div
            className="d-flex align-items-start p-2 border-bottom hover-bg rounded cursor-pointer"
            onClick={onClick}
            style={{ cursor: "pointer" }}
        >
            <img
                src={coverImage}
                alt="channel avatar"
                className="rounded-circle me-2"
                style={{ width: 48, height: 48, objectFit: "cover" }}
            />
            <div className="flex-grow-1">
                <div className="fw-bold">{title}</div>
                {lastMessage && (
                    <div className="text-muted" style={{ fontSize: "0.9em" }}>
                        {lastMessage.senderName}: {lastMessage.content}
                    </div>
                )}
            </div>
        </div>
    );
    const content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content;
});

export type {
    IChannel,
    IChannelParticipant
};

export default ChannelListItem;
