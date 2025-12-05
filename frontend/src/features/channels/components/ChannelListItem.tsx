import React from "react";
import { IChannelMessage } from "./ChannelMessage";
import { IChannelInvite } from "./InvitesListItem";
import DateUtils from "../../../utils/DateUtils";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { truncate } from "../../../utils/StringUtils";

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
    unreadCount: number;
    muted: boolean;
}

interface ChannelListItemProps {
    channel: IChannel;
    onClick: () => void;
    selected: boolean;
}

const ChannelListItem = React.forwardRef(({ channel, onClick, selected }: ChannelListItemProps, ref: React.ForwardedRef<HTMLDivElement>) => {

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
                        className="me-2 rounded-circle"
                        width={32}
                        height={32}
                    />
                    :
                    <ProfileAvatar size={32} avatarImage={channel.coverImage} />
            }
            <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-bold">
                        {channel.title}
                    </div>
                    <div className="small text-muted">
                        {DateUtils.format2(new Date(channel.updatedAt))}
                    </div>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="small">
                        {channel.lastMessage != null && (
                            channel.lastMessage.type === 1 ? (
                                <>
                                    <span className="text-primary">{channel.lastMessage.userName}: </span>
                                    {
                                        channel.lastMessage.deleted ?
                                            <i className="text-muted">Message was deleted</i>
                                            :
                                            <span className="text-muted">
                                                {truncate(channel.lastMessage.content, 20)}
                                            </span>
                                    }
                                </>
                            ) : (
                                <span className="text-muted">
                                    {truncate(channel.lastMessage.content.replace("{action_user}", channel.lastMessage.userName), 20)}
                                </span>
                            )
                        )}
                    </div>
                    <div>
                        {channel.unreadCount > 0 && (
                            <span
                                className={"badge " + (channel.muted ? "bg-secondary" : "bg-danger")}
                                style={{ fontSize: "0.7rem" }}
                            >
                                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                            </span>
                        )}
                    </div>
                </div>
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
