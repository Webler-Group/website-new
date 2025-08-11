import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import { IChannel, IChannelParticipant } from "./ChannelListItem";
import ChannelMessage from "./ChannelMessage";
import { Button, Form } from "react-bootstrap";
import { FaCog, FaTimes } from "react-icons/fa";
import ChannelRoomSettings from "./ChannelRoomSettings";
import { useApi } from "../../../context/apiCommunication";
import { IChannelInvite } from "./InvitesListItem";
import useMessages from "../hooks/useMessages";

interface ChannelRoomProps {
    channelId: string;
    onExit: () => void;
}

const ChannelRoom2 = ({ channelId, onExit }: ChannelRoomProps) => {
    const [channel, setChannel] = useState<IChannel | null>(null);
    const [messagesFromDate, setMessagesFromDate] = useState<Date | null>(null);
    const onChannelJoin = useCallback((newParticipant: IChannelParticipant) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: [...prev.participants!, newParticipant],
                invites: prev.invites!.filter(x => x.invitedUserId != newParticipant.userId)
            }
        });
    }, []);
    const onChannelLeave = useCallback((userId: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: prev.participants!.filter(x => x.userId != userId)
            }
        });
    }, []);
    const messages = useMessages(50, channelId, messagesFromDate, onChannelJoin, onChannelLeave);
    const [newMessage, setNewMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const { sendJsonRequest } = useApi();
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getChannel();
        setMessagesFromDate(null);
    }, [channelId]);

    useEffect(() => {
        const linesCount = newMessage.split("\n").length;
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.rows = Math.min(linesCount, 6);
        }
    }, [newMessage]);

    const messagesIntObserver = useRef<IntersectionObserver>();
    const lastMessageRef = useCallback((message: any) => {
        if (messages.isLoading) return;

        if (messagesIntObserver.current) messagesIntObserver.current.disconnect();

        messagesIntObserver.current = new IntersectionObserver(elems => {
            if (elems[0].isIntersecting && messages.hasNextPage) {

                setMessagesFromDate(() => new Date(messages.results[messages.results.length - 1].createdAt));
            }
        });

        if (message) messagesIntObserver.current.observe(message);
    }, [messages.isLoading, messages.hasNextPage]);

    const getChannel = async () => {
        const result = await sendJsonRequest("/Channels/GetChannel", "POST", {
            channelId,
            includeParticipants: true,
            includeInvites: true
        });
        if (result && result.channel) {
            setChannel(result.channel);
        }
    }

    const handleSendMessage = async () => {
        if (newMessage.trim().length == 0) return;
        const result = await sendJsonRequest("/Channels/CreateMessage", "POST", {
            channelId,
            content: newMessage.trim()
        });
        if (result && result.message) {
            setNewMessage("");

            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTo({
                        top: messagesContainerRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 50);
        }
    };

    const handleTextareaKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }

    const toggleSettings = () => {
        setSettingsVisible(value => !value);
    }

    const onUserKick = (userId: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: prev.participants!.filter(x => x.userId != userId)
            }
        });
    }

    const onUserInvite = (invite: IChannelInvite) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                invites: [...prev.invites!, invite]
            }
        });
    }

    const onRevokeInvite = (inviteId: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                invites: prev.invites!.filter(x => x.id != inviteId)
            }
        });
    }

    let firstTime: number;
    const messagesListContent = messages.results.map((message, i) => {
        const nextMessage = i < messages.results.length - 1 ? messages.results[i + 1] : null;

        let isLastFromUser = false;
        if (!nextMessage) {
            // No next message = always show header
            isLastFromUser = true;
        } else if (nextMessage.userId !== message.userId) {
            // Different user = show header
            isLastFromUser = true;
            const nextTime = new Date(nextMessage.createdAt).getTime();
            firstTime = nextTime;
        } else {
            // Same user, check time difference
            const currentTime = new Date(message.createdAt).getTime();
            if (i === 0) {
                firstTime = currentTime;
            }
            const nextTime = new Date(nextMessage.createdAt).getTime();

            if (Math.abs(nextTime - firstTime) > 30 * 1000) {
                isLastFromUser = true;
                firstTime = nextTime;
            }
        }

        return (
            <div key={i} className="mt-2">
                {messages.results.length === i + 1 ? (
                    <ChannelMessage
                        ref={lastMessageRef}
                        message={message}
                        showHeader={isLastFromUser}
                    />
                ) : (
                    <ChannelMessage
                        message={message}
                        showHeader={isLastFromUser}
                    />
                )}
            </div>
        );
    });


    if (!channel) return <div>Loading...</div>;

    return (
        <div className="d-flex flex-column" style={{ height: "calc(100dvh - 60px)" }}>

            <div className="d-flex align-items-center justify-content-between p-3 border-bottom z-2 bg-white" style={{ height: "60px" }}>
                <div className="d-flex align-items-center">
                    <Button variant="link" className="text-secondary" onClick={onExit}>
                        <FaTimes />
                    </Button>
                    <h5 className="mb-0">{channel.title}</h5>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={toggleSettings}>
                    <FaCog />
                </Button>
            </div>

            <div className="d-flex flex-column flex-grow-1 overflow-hidden">
                <div className={"wb-channels-settings bg-light p-3" + (settingsVisible ? "" : " wb-channels-settings__closed")}>
                    <ChannelRoomSettings channel={channel} onUserKick={onUserKick} onUserInvite={onUserInvite} onRevokeInvite={onRevokeInvite} />
                </div>
                <div className="flex-grow-1 overflow-y-auto p-3 ms-lg-5" ref={messagesContainerRef}>
                    <div className="d-flex flex-column-reverse" style={{ maxWidth: "600px" }}>{messagesListContent}</div>
                </div>

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
                        maxLength={1024}
                        style={{ resize: "none" }}
                    />
                    <Button variant="primary" onClick={handleSendMessage}>Send</Button>
                </div>
            </div>
        </div>
    );
};

export default ChannelRoom2;
