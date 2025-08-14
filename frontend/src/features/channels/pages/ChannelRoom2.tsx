import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import { IChannel, IChannelParticipant } from "../components/ChannelListItem";
import ChannelMessage from "../components/ChannelMessage";
import { Button, Form, Badge } from "react-bootstrap";
import { FaArrowCircleDown, FaCog, FaTimes } from "react-icons/fa";
import ChannelRoomSettings from "../components/ChannelRoomSettings";
import { useApi } from "../../../context/apiCommunication";
import { IChannelInvite } from "../components/InvitesListItem";
import useMessages from "../hooks/useMessages";
import { useAuth } from "../../auth/context/authContext";
import { FaPaperPlane } from "react-icons/fa6";

interface ChannelRoomProps {
    channelId: string;
    onExit: () => void;
}

const ChannelRoom2 = ({ channelId, onExit }: ChannelRoomProps) => {
    const [channel, setChannel] = useState<IChannel | null>(null);
    const [messagesFromDate, setMessagesFromDate] = useState<Date | null>(null);
    const { userInfo } = useAuth();
    const onChannelJoin = (newParticipant: IChannelParticipant) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: [...prev.participants!, newParticipant],
                invites: prev.invites!.filter(x => x.invitedUserId != newParticipant.userId)
            }
        });
    }
    const onChannelLeave = (userId: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: prev.participants!.filter(x => x.userId != userId)
            }
        });
    }
    const onMessagesSeen = useCallback((date: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return { ...prev, lastActiveAt: date };
        })
    }, []);
    const messages = useMessages(50, channelId, messagesFromDate, onChannelJoin, onChannelLeave, onMessagesSeen);
    const [newMessage, setNewMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const { sendJsonRequest } = useApi();
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [allMessagesVisible, setAllMessagesVisible] = useState(false);
    const [justChangedChannel, setJustChangedChannel] = useState(false);
    const [showJumpButton, setShowJumpButton] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const isAtBottomRef = useRef(true);
    const prevLatest = useRef<Date | null>(null);

    useEffect(() => {
        getChannel();
        setMessagesFromDate(null);
        setJustChangedChannel(true);
    }, [channelId]);

    useEffect(() => {
        if (channel && !channel.lastActiveAt) {
            messages.markMessagesSeen();
        }
    }, [channel]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Temporarily shrink to 1 row to measure correctly
        textarea.rows = 1;

        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10);
        const rows = Math.ceil(textarea.scrollHeight / lineHeight) - 1; // -1 feels more natural
        textarea.rows = Math.min(rows, 10);
    }, [newMessage]);

    const messagesIntObserver = useRef<IntersectionObserver>();
    const lastMessageRef = useCallback((message: Element | null) => {
        if (messages.isLoading) return;

        if (messagesIntObserver.current) messagesIntObserver.current.disconnect();

        messagesIntObserver.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && messages.hasNextPage) {
                    setMessagesFromDate(() => new Date(messages.results[messages.results.length - 1].createdAt));
                }
            }
        );

        if (message) messagesIntObserver.current.observe(message);
    }, [messages.isLoading, messages.hasNextPage, messages.results]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const isAtBottomNow = Math.abs(scrollTop) < 5;
            isAtBottomRef.current = isAtBottomNow;
            setShowJumpButton(!isAtBottomNow);

            if (isAtBottomNow && unreadCount > 0) {
                setUnreadCount(0);
            }

            if (isAtBottomNow && messages.results.length > 0 && channel?.lastActiveAt && new Date(channel.lastActiveAt) < new Date(messages.results[0].createdAt)) {
                messages.markMessagesSeen();
            }
        };

        handleScroll();

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [messages.results, channel, unreadCount]);

    useEffect(() => {
        if (messages.results.length > 0) {
            const currentLatestDate = new Date(messages.results[0].createdAt);
            if (prevLatest.current && currentLatestDate > prevLatest.current) {
                const newAdded = messages.results.filter(m => new Date(m.createdAt) > prevLatest.current!).length;
                if (isAtBottomRef.current) {
                    scrollToBottom('smooth');
                } else {
                    setUnreadCount(prev => prev + newAdded);
                }
            }
            prevLatest.current = currentLatestDate;
        }
    }, [messages.results]);

    useEffect(() => {
        if (messages.results.length > 0 && messages.results[0].userId == userInfo?.id) {
            setAllMessagesVisible(channel?.lastActiveAt != null && new Date(channel.lastActiveAt) < new Date(messages.results[0].createdAt));
        }
    }, [messages.results, channel, userInfo]);

    useEffect(() => {
        setAllMessagesVisible(prev => {
            if (prev) {
                scrollToBottom();
            }
            return false;
        });
    }, [allMessagesVisible]);

    // NEW: Effect to scroll to bottom after channel change and messages load
    useEffect(() => {
        if (justChangedChannel && !messages.isLoading && messages.results.length > 0) {
            scrollToBottom('auto');
            setJustChangedChannel(false);
        }
    }, [justChangedChannel, messages.isLoading, messages.results]);

    const isMobileDevice = () => {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    };

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        const container = messagesContainerRef.current;
        if (!container) return;

        // For flex-column-reverse, the bottom is scrollTop = 0
        container.scrollTo({ top: 0, behavior })
    }

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
        if (newMessage.trim().length === 0) return;
        messages.sendMessage(newMessage);
        setNewMessage("");
    };


    const handleTextareaKeydown = (e: KeyboardEvent) => {
        if (isMobileDevice()) return;
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
    const renderMessages = messages.results.filter(x => allMessagesVisible || (channel?.lastActiveAt && new Date(channel.lastActiveAt) >= new Date(x.createdAt)));
    const messagesListContent = renderMessages.map((message, i) => {
        const nextMessage = i < renderMessages.length - 1 ? renderMessages[i + 1] : null;

        let isLastFromUser = false;
        if (!nextMessage) {
            // No next message = always show header
            isLastFromUser = true;
        } else if (nextMessage.userId !== message.userId || nextMessage.type !== 1) {
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

            if (Math.abs(nextTime - firstTime) > 2 * 60 * 1000) {
                isLastFromUser = true;
                firstTime = nextTime;
            }
        }

        return (
            <div key={i} className="mt-2">
                {i === renderMessages.length - 1 ? (
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
        <div className="d-flex flex-column" style={{ height: "calc(100dvh - 44px)" }}>

            <div className="d-flex align-items-center justify-content-between p-3 border-bottom z-3 bg-white" style={{ height: "44px" }}>
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
                <div className={"wb-channels-settings bg-light p-3 z-2 " + (settingsVisible ? "" : " wb-channels-settings__closed")}>
                    <ChannelRoomSettings channel={channel} onUserKick={onUserKick} onUserInvite={onUserInvite} onRevokeInvite={onRevokeInvite} />
                </div>
                <div className="d-flex flex-column-reverse flex-grow-1 overflow-y-auto p-3 ms-lg-5" ref={messagesContainerRef}>
                    {messagesListContent}
                </div>
                <div className="position-relative p-2 border-top d-flex align-items-center">
                    {showJumpButton && (
                        <Button
                            size="sm"
                            variant="secondary"
                            className="position-absolute end-0 me-3 mt-1 z-1"
                            style={{ top: "-50px" }}
                            onClick={() => {
                                scrollToBottom('smooth');
                                setUnreadCount(0);
                            }}
                        >
                            {unreadCount > 0 && <Badge bg="info" className="me-2">{unreadCount + " new message" + (unreadCount > 1 ? "s" : "")}</Badge>}
                            <FaArrowCircleDown />
                        </Button>
                    )}
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
                    {
                        newMessage.trim().length > 0 &&
                        <Button variant="primary" onClick={handleSendMessage}>
                            <FaPaperPlane />
                        </Button>
                    }
                </div>
            </div>
        </div>
    );
};

export default ChannelRoom2;