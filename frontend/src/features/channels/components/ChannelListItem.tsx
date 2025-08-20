import React from "react";
import { IChannelMessage } from "./ChannelMessage";
import { IChannelInvite } from "./InvitesListItem";
import DateUtils from "../../../utils/DateUtils";
import ProfileAvatar from "../../../components/ProfileAvatar";

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
    createdAt: string;
    updatedAt: string;
    lastMessage?: IChannelMessage;
    invites?: IChannelInvite[];
    participants?: IChannelParticipant[];
    lastActiveAt?: string;
}

interface ChannelListItemProps {
    channel: IChannel;
    onClick: () => void;
    selected: boolean;
}

const ChannelListItem = React.forwardRef(({ channel, onClick, selected }: ChannelListItemProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const formatMessageContent = (content: string) => {
        return content.length > 20
            ? content.slice(0, 20) + "..."
            : content
    }

    let body = (
        <div
            className={`d-flex align-items-center gap-2 p-2 border-bottom cursor-pointer ${selected ? "border border-2 border-dark" : "border-bottom"}`}
            onClick={onClick}
            style={{ cursor: "pointer" }}
        >
            {
                channel.type == 2 ?
                    <img
                        src="/resources/images/group.svg"
                        alt="channel avatar"
                        className="me-2"
                        width={32}
                        height={32}
                    />
                    :
                    <ProfileAvatar size={32} avatarImage={channel.coverImage} />
            }
            <div className="flex-grow-1">
                <div className="d-flex justify-content-between">
                    <div className="fw-bold d-flex align-items-center gap-2">
                        {channel.title}
                        {channel.lastMessage && channel.lastMessage.viewed === false && (
                            <span
                                className="badge bg-danger"
                                style={{ fontSize: "0.7rem" }}
                            >
                                NEW
                            </span>
                        )}
                    </div>
                    <div className="small text-muted">
                        {DateUtils.format2(new Date(channel.updatedAt))}
                    </div>
                </div>
                {channel.lastMessage && (
                    <div className="small">
                        {channel.lastMessage.type === 1 ? (
                            <>
                                <span className="text-primary">{channel.lastMessage.userName}:</span>{" "}
                                <span className="text-muted">
                                    {formatMessageContent(channel.lastMessage.content)}
                                </span>
                            </>
                        ) : (
                            <span className="text-muted">
                                {formatMessageContent(channel.lastMessage.content.replace("{action_user}", channel.lastMessage.userName))}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return ref ? <div ref={ref}>{body}</div> : <div>{body}</div>;
});


export type {
    IChannel,
    IChannelParticipant
};

export default ChannelListItem;
