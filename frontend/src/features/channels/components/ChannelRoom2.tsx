import { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import ChannelMessage from "./ChannelMessage";
import { Button, Form, Badge, Modal } from "react-bootstrap";
import { FaArrowCircleDown, FaCog, FaPlus, FaTimes } from "react-icons/fa";
import ChannelRoomSettings from "./ChannelRoomSettings";
import { useApi } from "../../../context/apiCommunication";
import useMessages from "../hooks/useMessages";
import { useAuth } from "../../auth/context/authContext";
import { FaArrowLeft, FaCheck, FaPaperPlane, FaPen } from "react-icons/fa6";
import MessageContextMenu from "./MessageContextMenu";
import RepliedMessage from "./RepliedMessage";
import Loader from "../../../components/Loader";
import PostAttachmentSelect from "../../../components/post-attachment-select/PostAttachmentSelect";
import { ChannelDetails, ChannelMessageDetails, ChannelParticipantDetails, GetChannelData, InviteDetails } from "../types";
import ChannelRolesEnum from "../../../data/ChannelRolesEnum";
import ImagePreview from "../../../components/ImagePreview";
import FileExplorer from "../../../components/file-explorer/FileExplorer";

interface ChannelRoomProps {
    channelId: string;
    onExit: () => void;
}

const MAX_ROWS = 5;

const AttachDropdown = ({ onCode, onImage }: { onCode: () => void; onImage: () => void; }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div ref={ref} className="position-relative">
            <Button variant="link" className="text-secondary" onClick={() => setOpen(v => !v)}>
                <FaPlus />
            </Button>
            {open && (
                <div
                    className="position-absolute bg-white border rounded shadow-sm py-1"
                    style={{ bottom: "100%", right: 0, minWidth: "120px", zIndex: 10 }}
                >
                    {[
                        { label: "Code", action: onCode },
                        { label: "Image", action: onImage },
                    ].map(({ label, action }) => (
                        <button
                            key={label}
                            className="dropdown-item px-3 py-2"
                            onClick={() => { action(); setOpen(false); }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const ChannelRoom2 = ({ channelId, onExit }: ChannelRoomProps) => {
    const [channel, setChannel] = useState<ChannelDetails | null>(null);
    const [messagesFromDate, setMessagesFromDate] = useState<Date | null>(null);
    const { userInfo } = useAuth();
    const onChannelJoin = (newParticipant: ChannelParticipantDetails) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: [...prev.participants, newParticipant],
                invites: prev.invites.filter(invite => invite.invitedUser.id != newParticipant.user.id)
            }
        });
    }
    const onChannelLeave = (userId: string) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: prev.participants!.filter(participant => participant.user.id != userId)
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
    const [selectedMessage, setSelectedMessage] = useState<ChannelMessageDetails | null>(null);
    const [editedMessage, setEditedMessage] = useState<ChannelMessageDetails | null>(null);
    const anchorRef = useRef<HTMLElement | null>(null);
    const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
    const [skipTransition, setSkipTransition] = useState(true);
    const [loading, setLoading] = useState(false);
    const [repliedMessage, setRepliedMessage] = useState<ChannelMessageDetails | null>(null);
    const nodeRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());
    const [preview, setPreview] = useState<null | { src: string; alt?: string; }>(null);
    const [postAttachmentSelectVisible, setPostAttachmentSelectVisible] = useState(false);
    const [showImages, setShowImages] = useState(false);

    useEffect(() => {
        getChannel();
        setMessagesFromDate(null);
        setJustChangedChannel(true);
        setSettingsVisible(false);
        setSkipTransition(true);
    }, [channelId]);

    useEffect(() => {
        if (channel && !channel.lastActiveAt) {
            messages.markMessagesSeen();
        }
    }, [channel?.id]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.rows = 1;
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10);
        const rows = Math.ceil(textarea.scrollHeight / lineHeight) - 1;
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

    const messagesIntObserver = useRef<IntersectionObserver>(null);
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
        if (messages.results.length > 0 && messages.results[0].user.id == userInfo?.id) {
            setAllMessagesVisible(channel?.lastActiveAt != null && new Date(channel.lastActiveAt) < new Date(messages.results[0].createdAt));
        }
    }, [messages.results.length, channel?.id, userInfo]);

    useEffect(() => {
        if (allMessagesVisible) {
            scrollToBottom("smooth");
        }
        setAllMessagesVisible(false);
    }, [allMessagesVisible]);

    useEffect(() => {
        if (justChangedChannel && !messages.isLoading && messages.results.length > 0) {
            scrollToBottom('auto');
            setJustChangedChannel(false);
            setSkipTransition(false);
        }
    }, [justChangedChannel, messages.isLoading, messages.results]);

    useEffect(() => {
        const currentIds = new Set(messages.results.map(m => m.id));
        for (const key of nodeRefs.current.keys()) {
            if (!currentIds.has(key)) {
                nodeRefs.current.delete(key);
            }
        }
    }, [messages.results]);

    const isMobileDevice = () => {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    };

    const getNodeRef = (id: string) => {
        if (!nodeRefs.current.has(id)) {
            nodeRefs.current.set(id, { current: null });
        }
        return nodeRefs.current.get(id)!;
    };

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        setTimeout(() => {
            const container = messagesContainerRef.current;
            if (container) {
                container.scrollTo({ top: 0, behavior })
            }
        }, 50);
    }

    const getChannel = async () => {
        setLoading(true);
        const result = await sendJsonRequest<GetChannelData>("/Channels/GetChannel", "POST", {
            channelId,
            includeParticipants: true,
            includeInvites: true
        });
        if (result.data) {
            setChannel(result.data.channel);
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
                participants: prev.participants.filter(participant => participant.user.id != userId)
            }
        });
    }

    const onUserInvite = (invite: InviteDetails) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                invites: [...prev.invites, invite]
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

    const onRoleChange = (userId: string, role: ChannelRolesEnum) => {
        setChannel(prev => {
            if (!prev) return null;
            return {
                ...prev,
                participants: prev.participants!.map(participant => {
                    if (participant.user.id == userId) {
                        return { ...participant, role };
                    } else if (participant.user.id == userInfo?.id && role === ChannelRolesEnum.OWNER) {
                        return { ...participant, role: ChannelRolesEnum.ADMIN }
                    }
                    return participant;
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

    const onContextMenu = (message: ChannelMessageDetails, target: HTMLElement | null) => {
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

    const handlePostAttachments = (selected: string[]) => {
        setNewMessage(prev => (prev.trim().length == 0 || prev.endsWith("\n") ? prev : prev + "\n") + selected.join("\n") + "\n");
    }

    const handleImageSelect = (url: string) => {
        setNewMessage(prev => (prev.trim().length == 0 || prev.endsWith("\n") ? prev : prev + "\n") + url + "\n");
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
                        <PostAttachmentSelect show={postAttachmentSelectVisible} onClose={() => setPostAttachmentSelectVisible(false)} onSubmit={handlePostAttachments} />
                        <FileExplorer
                            title="Image Select"
                            section="Profile"
                            rootAlias="post-images"
                            show={showImages}
                            onHide={() => setShowImages(false)}
                            onSelect={handleImageSelect}
                        />
                        {preview && (
                            <ImagePreview src={preview.src} alt={preview.alt} onClose={() => setPreview(null)} />
                        )}
                        <div className="d-flex align-items-center justify-content-between p-3 border-bottom z-3 bg-white" style={{ height: "44px" }}>
                            <div className="d-flex align-items-center">
                                <Button variant="link" className="text-secondary" onClick={onExit}>
                                    <FaTimes />
                                </Button>
                                <h5 className="mb-0">{channel.title}</h5>
                            </div>
                            <Button variant="secondary" size="sm" onClick={toggleSettings}>
                                {settingsVisible ? (
                                    <><FaTimes className="me-1" /> Settings</>
                                ) : (
                                    <><FaCog className="me-1" /> Settings</>
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
                                            isLastFromUser = true;
                                        } else if (nextMessage.user.id !== message.user.id || nextMessage.type !== 1) {
                                            isLastFromUser = true;
                                            const nextTime = new Date(nextMessage.createdAt).getTime();
                                            firstTime = nextTime;
                                        } else {
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
                                                nodeRef={getNodeRef(message.id)}
                                            >
                                                <div ref={getNodeRef(message.id)} className="mt-2">
                                                    <ChannelMessage
                                                        ref={i === renderMessages.length - 1 ? lastMessageRef : undefined}
                                                        message={message}
                                                        showHeader={isLastFromUser || message.repliedTo != null}
                                                        onContextMenu={onContextMenu}
                                                        onImagePreview={setPreview}
                                                    />
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
                                        <Button size="sm" variant="link" className="text-muted ms-2 p-0 flex-shrink-0" onClick={() => setRepliedMessage(null)}>
                                            <FaTimes />
                                        </Button>
                                    </div>
                                }
                                <div className="d-flex align-items-center gap-2">
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
                                    <AttachDropdown
                                        onCode={() => setPostAttachmentSelectVisible(true)}
                                        onImage={() => setShowImages(true)}
                                    />
                                    {newMessage.trim().length > 0 &&
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
                isOwn={selectedMessage?.user.id === userInfo?.id}
                anchorRef={anchorRef}
            />
        </div>
    );
};

export default ChannelRoom2;