import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { IChannel } from "./ChannelListItem";
import { IChannelMessage } from "./ChannelMessage";
import ChannelMessage from "./ChannelMessage";
import { Button, Form } from "react-bootstrap";
import { FaCog } from "react-icons/fa";

// Mock function to simulate fetching channel
const mockFetchChannel = async (channelId: string): Promise<IChannel> => {
    return {
        coverImage: "/resources/images/group1.jpg",
        title: `Channel ${channelId}`,
        lastMessage: {
            content: "Last message content",
            senderId: "u123",
            senderName: "Alice",
            date: new Date().toISOString(),
        },
    };
};

// Mock function to simulate fetching messages
const mockFetchMessages = async (): Promise<IChannelMessage[]> => {
    return [
        {
            content: "Hello!",
            senderId: "u1",
            senderName: "Alice",
            date: new Date().toISOString(),
        },
        {
            content: "Hi, how are you?",
            senderId: "u2",
            senderName: "Bob",
            date: new Date().toISOString(),
        },
    ];
};

interface ChannelRoomProps {
    channelId: string;
}

const ChannelRoom2 = ({ channelId }: ChannelRoomProps) => {
    const [channel, setChannel] = useState<IChannel | null>(null);
    const [messages, setMessages] = useState<IChannelMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Simulate fetch
        mockFetchChannel(channelId).then(setChannel);
        mockFetchMessages().then(setMessages);
    }, [channelId]);

    useEffect(() => {
        const linesCount = newMessage.split("\n").length;
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.rows = Math.min(linesCount, 6);
        }
    }, [newMessage]);

    const handleSendMessage = () => {
        if (newMessage.trim() === "") return;

        const newMsg: IChannelMessage = {
            content: newMessage,
            senderId: "me",
            senderName: "You",
            date: new Date().toISOString(),
        };

        setMessages(prev => [...prev, newMsg]);
        setNewMessage("");
    };

    const handleTextareaKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }

    if (!channel) return <div>Loading...</div>;

    return (
        <div className="d-flex flex-column" style={{ height: "calc(100dvh - 60px)" }}>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
                <h5 className="mb-0">{channel.title}</h5>
                <Button variant="outline-secondary" size="sm">
                    <FaCog />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-grow-1 overflow-auto p-3" style={{ backgroundColor: "#f8f9fa" }}>
                {messages.map((msg, idx) => (
                    <ChannelMessage key={idx} message={msg} />
                ))}
            </div>

            {/* Input */}
            <div className="p-3 border-top d-flex align-items-center">
                <Form.Control
                    ref={textareaRef}
                    as="textarea"
                    rows={1}
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleTextareaKeydown}
                    className="me-2"
                />
                <Button variant="primary" onClick={handleSendMessage}>
                    Send
                </Button>
            </div>
        </div>
    );
};

export default ChannelRoom2;
