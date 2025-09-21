import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { IChannel, IChannelParticipant } from "../components/ChannelListItem";
import ChannelMessage from "../components/ChannelMessage";
import { Button, Form, Badge, Modal } from "react-bootstrap";
import { FaArrowCircleDown, FaCog, FaTimes } from "react-icons/fa";
import ChannelRoomSettings from "./ChannelRoomSettings";
import { useApi } from "../../../context/apiCommunication";
import { IChannelInvite } from "../components/InvitesListItem";
import useMessages from "../hooks/useMessages";
import { useAuth } from "../../auth/context/authContext";
import { FaArrowLeft, FaCheck, FaPaperPlane, FaPen } from "react-icons/fa6";
import { IChannelMessage } from "../components/ChannelMessage";
import MessageContextMenu from "../components/MessageContextMenu";
import RepliedMessage from "../components/RepliedMessage";
import Loader from "../../../components/Loader";
interface ChannelRoomProps {
    channelId: string;
    onExit: () => void;
}

const MAX_ROWS = 5;

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
    const onMessagesSeen = (date: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return { ...prev, lastActiveAt: date };
        })
    }
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
    const [selectedMessage, setSelectedMessage] = useState<IChannelMessage | null>(null);
    const [editedMessage, setEditedMessage] = useState<IChannelMessage | null>(null);
    const anchorRef = useRef<HTMLElement | null>(null);
    const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
    const [skipTransition, setSkipTransition] = useState(true); // Updated: State to skip animations on initial load
    const [loading, setLoading] = useState(false);
    const [repliedMessage, setRepliedMessage] = useState<IChannelMessage | null>(null);

    useEffect(() => {
        getChannel();
        setMessagesFromDate(null);
        setJustChangedChannel(true);
        setSettingsVisible(false);
        setSkipTransition(true); // Reset skip on channel change
    }, [channelId]);

    useEffect(() => {
        if (channel && !channel.lastActiveAt) {
            messages.markMessagesSeen();
        }
    }, [channel?.id]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Temporarily shrink to 1 row to measure correctly
        textarea.rows = 1;

        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10);
        const rows = Math.ceil(textarea.scrollHeight / lineHeight) - 1; // -1 feels more natural
        textarea.rows = Math.min(rows, MAX_ROWS);
    }, [newMessage]);

    useEffect(() => {
        if (editedMessage) {
            setNewMessage(editedMessage.content);
            textareaRef.current?.focus();
        } else {
            setNewMessage("");
            textareaRef.current?.blur();
        }
    }, [editedMessage]);

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
    }, [messages.isLoading, messages.hasNextPage, messages.results.length]);

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
                setChannel(prev => {
                    if (!prev) return null;
                    return { ...prev, lastActiveAt: messages.results[0].createdAt };
                });
                messages.markMessagesSeen();
            }
        };

        handleScroll();

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, [messages.results.length, channel?.id, unreadCount]);

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
    }, [messages.results.length]);

    useEffect(() => {
        if (messages.results.length > 0 && messages.results[0].userId == userInfo?.id) {
            setAllMessagesVisible(channel?.lastActiveAt != null && new Date(channel.lastActiveAt) < new Date(messages.results[0].createdAt));
        }
    }, [messages.results.length, channel?.id, userInfo]);

    useEffect(() => {
        if (allMessagesVisible) {
            scrollToBottom("smooth");
        }
        setAllMessagesVisible(false);
    }, [allMessagesVisible]);

    // NEW: Effect to scroll to bottom after channel change and messages load
    useEffect(() => {
        if (justChangedChannel && !messages.isLoading && messages.results.length > 0) {
            scrollToBottom('auto');
            setJustChangedChannel(false);
            setSkipTransition(false); // Updated: Enable transitions after initial load to allow animations only for new messages
        }
    }, [justChangedChannel, messages.isLoading, messages.results]);

    const isMobileDevice = () => {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    };

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        setTimeout(() => {
            const container = messagesContainerRef.current;
            if (container) {
                // For flex-column-reverse, the bottom is scrollTop = 0
                container.scrollTo({ top: 0, behavior })
            }
        }, 50);
    }

    const getChannel = async () => {
        setLoading(true);
        const result = await sendJsonRequest("/Channels/GetChannel", "POST", {
            channelId,
            includeParticipants: true,
            includeInvites: true
        });
        if (result && result.channel) {
            setChannel(result.channel);
        }
        setLoading(false);
    }

    const handleSendMessage = async () => {
        if (newMessage.trim().length === 0) return;

        if (editedMessage) {
            messages.editMessage(editedMessage.id, newMessage);
            setEditedMessage(null);
        } else {
            messages.sendMessage(newMessage, repliedMessage);
        }
        setNewMessage("");
        setRepliedMessage(null);
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

    const onUserRemove = (userId: string) => {
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

    const onCancelInvite = (inviteId: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                invites: prev.invites!.filter(x => x.id != inviteId)
            }
        });
    }

    const onTitleChange = (title: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return { ...prev, title };
        });
    }

    const onRoleChange = (userId: string, role: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: prev.participants!.map(x => {
                    if (x.userId == userId) {
                        return { ...x, role };
                    } else if (x.userId == userInfo?.id && role === "Owner") {
                        return { ...x, role: "Admin" }
                    }
                    return x;
                })
            }
        });
    }

    const onToggleNotifications = (enabled: boolean) => {
        setChannel(prev => {
            if (!prev) return null;
            return { ...prev, muted: !enabled };
        })
    }

    const onContextMenu = (message: IChannelMessage, target: HTMLElement | null) => {
        if (!target || message.type !== 1 || message.deleted) return;
        setSelectedMessage(message);
        anchorRef.current = target;
    }

    const closeDeleteModal = () => {
        setDeleteMessageId(null);
    }

    const handleDeleteMessage = () => {
        if (deleteMessageId) {
            messages.deleteMessage(deleteMessageId);
        }
        setDeleteMessageId(null);
        closeDeleteModal();
    }

    const handleEditCancel = () => {
        setEditedMessage(null);
    }

    const onContextCopy = () => {
        if (selectedMessage) {
            navigator.clipboard.writeText(selectedMessage.content);
        }
        setSelectedMessage(null);
    }

    const onContextDelete = () => {
        setEditedMessage(null);
        setRepliedMessage(null);
        setSelectedMessage(prev => {
            if (prev) {
                setDeleteMessageId(prev.id);
            }
            return null;
        });
    }

    const onContextEdit = () => {
        setDeleteMessageId(null);
        setRepliedMessage(null);
        setSelectedMessage(prev => {
            if (prev) {
                setEditedMessage(prev);
            }
            return null;
        });
    }

    const onMessageReply = () => {
        setDeleteMessageId(null);
        setEditedMessage(null);
        setSelectedMessage(prev => {
            if (prev) {
                setRepliedMessage(prev);
                textareaRef.current?.focus();
            }
            return null;
        });
    }

    let firstTime: number;
    const renderMessages = messages.results.filter(x => allMessagesVisible || (channel?.lastActiveAt && new Date(channel.lastActiveAt) >= new Date(x.createdAt)));

    return (
        <div className="d-flex flex-column" style={{ height: "100dvh" }}>
            {
                channel !== null ?
                    <>
                        <Modal show={deleteMessageId !== null} onHide={closeDeleteModal} centered>
                            <Modal.Header closeButton>
                                <Modal.Title>Are you sure?</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>Selected message will be deleted.</Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                                <Button variant="danger" onClick={handleDeleteMessage}>Delete</Button>
                            </Modal.Footer>
                        </Modal>
                        <div className="d-flex align-items-center justify-content-between p-3 border-bottom z-3 bg-white" style={{ height: "44px" }}>
                            <div className="d-flex align-items-center">
                                <Button variant="link" className="text-secondary" onClick={onExit}>
                                    <FaTimes />
                                </Button>
                                <h5 className="mb-0">{channel.title}</h5>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={toggleSettings}
                            >
                                {settingsVisible ? (
                                    <>
                                        <FaTimes className="me-1" /> Settings
                                    </>
                                ) : (
                                    <>
                                        <FaCog className="me-1" /> Settings
                                    </>
                                )}
                            </Button>

                        </div>

                        <div className="d-flex flex-column flex-grow-1 overflow-hidden">
                            <div className={"wb-channels-settings bg-light p-3 z-2 " + (settingsVisible ? "" : " wb-channels-settings__closed")}>
                                <ChannelRoomSettings channel={channel} onUserRemove={onUserRemove} onUserInvite={onUserInvite} onCancelInvite={onCancelInvite} onTitleChange={onTitleChange} onRoleChange={onRoleChange} onToggleNotifications={onToggleNotifications} />
                            </div>
                            <div className="d-flex flex-column-reverse flex-grow-1 overflow-y-auto p-3 ms-lg-5" ref={messagesContainerRef}>
                                <TransitionGroup component={null}>
                                    {renderMessages.map((message, i) => {
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
                                            <CSSTransition
                                                key={message.id}
                                                timeout={300}
                                                classNames={skipTransition ? "" : "wb-channels-message"}
                                            >
                                                <div className="mt-2">
                                                    {i === renderMessages.length - 1 ? (
                                                        <ChannelMessage
                                                            ref={lastMessageRef}
                                                            message={message}
                                                            showHeader={isLastFromUser || message.repliedTo != null}
                                                            onContextMenu={onContextMenu}
                                                        />
                                                    ) : (
                                                        <ChannelMessage
                                                            message={message}
                                                            showHeader={isLastFromUser || message.repliedTo != null}
                                                            onContextMenu={onContextMenu}
                                                        />
                                                    )}
                                                </div>
                                            </CSSTransition>
                                        );
                                    })}
                                </TransitionGroup>
                            </div>
                            <div className="position-relative p-2 border-top">
                                {editedMessage && (
                                    <div className="small">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="fw-bold text-info"><FaPen /> Edit message</div>
                                            <Button size="sm" variant="link" className="text-muted" onClick={handleEditCancel}>
                                                <FaTimes />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {repliedMessage &&
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <RepliedMessage message={repliedMessage} />
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="link"
                                            className="text-muted ms-2 p-0 flex-shrink-0"
                                            onClick={() => setRepliedMessage(null)}
                                        >
                                            <FaTimes />
                                        </Button>
                                    </div>
                                }
                                <div className="d-flex align-items-center">
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
                                        className="me-2 border-0"
                                        maxLength={1024}
                                        style={{ resize: "none", boxShadow: "none" }}
                                    />
                                    {
                                        newMessage.trim().length > 0 &&
                                        <Button variant="primary" onClick={handleSendMessage}>
                                            {editedMessage ? <FaCheck /> : <FaPaperPlane />}
                                        </Button>
                                    }
                                </div>
                            </div>
                        </div>
                    </>
                    :
                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                        {
                            loading ?
                                <Loader />
                                :
                                <div>
                                    <h4>Channel not found</h4>
                                    <Button onClick={onExit} variant='primary'>
                                        <FaArrowLeft />
                                        Back to Channels
                                    </Button>
                                </div>
                        }
                    </div>
            }
            <MessageContextMenu
                visible={selectedMessage !== null}
                onClose={() => setSelectedMessage(null)}
                onCopy={onContextCopy}
                onEdit={onContextEdit}
                onDelete={onContextDelete}
                onReply={onMessageReply}
                isOwn={selectedMessage?.userId === userInfo?.id}
                anchorRef={anchorRef}
            />
        </div>
    );
};

export default ChannelRoom2;