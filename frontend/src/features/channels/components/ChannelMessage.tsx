import React from "react";
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
    channelId: string;
    viewed: boolean;
    attachments: IPostAttachment[];
}

interface ChannelMessageProps {
    message: IChannelMessage;
    showHeader: boolean;
}

const ChannelMessage = React.forwardRef(({ message, showHeader }: ChannelMessageProps, ref: React.ForwardedRef<HTMLDivElement>) => {

    const messageParts = message.content.split("{action_user}");
    let body = message.type !== 1 ? (
        <div className="d-flex justify-content-center">
            <div className="p-2 rounded small bg-light text-center">
                {messageParts[0]}
                <ProfileName
                    userId={message.userId}
                    userName={message.userName}
                />
                {messageParts[1]}
            </div>
        </div>
    ) : (
        <div className="d-flex">
            {showHeader && (
                <div className="me-2 flex-shrink-0">
                    <ProfileAvatar avatarImage={message.userAvatar} size={42} />
                </div>
            )}

            <div className="flex-grow-1">
                {showHeader && (
                    <div className="d-flex align-items-center mb-1">
                        <ProfileName userId={message.userId} userName={message.userName} />
                        <small className="text-muted ms-2">
                            {DateUtils.format(new Date(message.createdAt))}
                        </small>
                    </div>
                )}

                <div className={`bg-light p-2 rounded wb-channels-message__body ${!showHeader ? "ms-5" : ""}`}>
                    {message.content}
                    <div className="mt-2">
                        {
                            message.attachments.map(attachment => {
                                return (
                                    <div key={attachment.id} className="mt-1">
                                        <PostAttachment data={attachment} />
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
            </div>
        </div>
    );

    body = (<div style={{ maxWidth: "720px" }}>{body}</div>);

    const content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content;
});

export type {
    IChannelMessage
};

export default ChannelMessage;
