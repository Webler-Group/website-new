import { IChannelMessage } from "./ChannelMessage";

interface IChannel {
    coverImage: string;
    title: string;
    lastMessage?: IChannelMessage;
}

interface ChannelListItemProps {
    channel: IChannel;
    onClick?: () => void;
}

const ChannelListItem = ({ channel, onClick }: ChannelListItemProps) => {
    const { coverImage, title, lastMessage } = channel;

    return (
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
};

export type {
    IChannel
};

export default ChannelListItem;
