interface IChannelMessage {
    content: string;
    senderId: string;
    senderName: string;
    date: string;
}

interface ChannelMessageProps {
    message: IChannelMessage;
}

const ChannelMessage = ({ message }: ChannelMessageProps) => {
    const { senderName, content, date } = message;
    const formattedDate = new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="mb-3">
            <div className="fw-bold">{senderName} <small className="text-muted">{formattedDate}</small></div>
            <div className="bg-light p-2 rounded">{content}</div>
        </div>
    );
};

export type {
    IChannelMessage
};

export default ChannelMessage;
