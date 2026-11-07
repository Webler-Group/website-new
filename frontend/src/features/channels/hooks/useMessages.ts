import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useWS } from "../../../context/wsCommunication";
import { ChannelMessageDetails, ChannelMessagesListData, ChannelParticipantDetails, MessageDeletedData, MessageEditedData, MessagesSeenData, NewMessageData, PendingMessage, SendMessageAck } from "../types";
import ChannelMessageTypeEnum from "../../../data/ChannelMessageTypeEnum";
import ChannelRolesEnum from "../../../data/ChannelRolesEnum";

const SEND_TIMEOUT_MS = 15_000;

const generateClientId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);

/** Inserts message into a newest-first list, ignoring duplicates (same id) */
const insertMessage = (list: ChannelMessageDetails[], message: ChannelMessageDetails) => {
    if (list.some(x => x.id === message.id)) return list;
    const time = new Date(message.createdAt).getTime();
    const index = list.findIndex(x => new Date(x.createdAt).getTime() <= time);
    if (index === -1) return [...list, message];
    return [...list.slice(0, index), message, ...list.slice(index)];
};

const useMessages = (count: number, channelId: string | null, fromDate: Date | null, onChannelJoin: (user: ChannelParticipantDetails) => void, onChannelLeave: (userId: string) => void, onMessagesSeen: (date: string) => void) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<ChannelMessageDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const [pending, setPending] = useState<PendingMessage[]>([]);
    const { socket } = useWS();
    const channelIdRef = useRef(channelId);
    channelIdRef.current = channelId;

    const fetchMessages = async (date: Date | null, replace: boolean) => {
        setIsLoading(true);
        setError("");

        const result = await sendJsonRequest<ChannelMessagesListData>(`/Channels/Messages`, "POST", {
            fromDate: date,
            count,
            channelId
        });

        if (result.data) {
            setResults(prev =>
                replace ? result.data!.messages : [...prev, ...result.data!.messages]
            );
            setHasNextPage(result.data.messages.length === count);
        } else {
            setError(result.error?.[0].message ?? "Something went wrong");
        }

        setIsLoading(false);
    };

    useEffect(() => {
        setPending([]);
        if (!channelId) return;
        fetchMessages(null, true);
    }, [channelId]);

    useEffect(() => {
        if (!channelId || fromDate === null) return;
        fetchMessages(fromDate, false);
    }, [fromDate]);

    useEffect(() => {
        if (!socket) return () => { };

        const handleNewMessage = (data: NewMessageData) => {
            const newMessage = data.message;
            if (newMessage.channel.id === channelId) {
                if (newMessage.type == ChannelMessageTypeEnum.USER_JOINED) {
                    onChannelJoin({
                        user: newMessage.user,
                        role: ChannelRolesEnum.MEMBER
                    });
                } else if (newMessage.type == ChannelMessageTypeEnum.USER_LEFT) {
                    onChannelLeave(newMessage.user.id);
                }
                setResults(prev => insertMessage(prev, newMessage));
                if (newMessage.clientId) {
                    setPending(prev => prev.filter(x => x.clientId !== newMessage.clientId));
                }
            }
        };

        const handleMessagesSeen = (data: MessagesSeenData) => {
            onMessagesSeen(data.lastActiveAt);
        }

        const handleMessageDeleted = (data: MessageDeletedData) => {
            setResults(prev => prev.map(x => x.id == data.messageId ? { ...x, deleted: true } : x))
        }

        const handleMessageEdited = (data: MessageEditedData) => {
            setResults(prev => prev.map(x => x.id == data.messageId ? { ...x, ...data } : x))
        }

        socket.on("channels:new_message", handleNewMessage);
        socket.on("channels:messages_seen", handleMessagesSeen);
        socket.on("channels:message_deleted", handleMessageDeleted);
        socket.on("channels:message_edited", handleMessageEdited);

        return () => {
            socket.off("channels:new_message", handleNewMessage);
            socket.off("channels:messages_seen", handleMessagesSeen);
            socket.off("channels:message_deleted", handleMessageDeleted);
            socket.off("channels:message_edited", handleMessageEdited);
        }
    }, [socket, channelId]);

    const markMessagesSeen = useCallback(() => {
        if (!socket) return;

        socket.emit("channels:messages_seen", {
            channelId
        });
    }, [socket, channelId]);

    const updatePending = (clientId: string, changes: Partial<PendingMessage>) => {
        setPending(prev => prev.map(x => x.clientId === clientId ? { ...x, ...changes } : x));
    };

    const emitPending = useCallback((message: PendingMessage) => {
        if (!socket || !socket.connected) {
            // Don't let socket.io buffer the emit - it would be delivered later and could duplicate a resend
            updatePending(message.clientId, { status: "failed", error: "No connection" });
            return;
        }

        socket.timeout(SEND_TIMEOUT_MS).emit("channels:send_message", {
            channelId: message.channelId,
            content: message.content,
            repliedTo: message.repliedTo?.id ?? null,
            clientId: message.clientId
        }, (err: Error | null, response?: SendMessageAck) => {
            if (err || !response) {
                updatePending(message.clientId, { status: "failed", error: "Timed out" });
                return;
            }
            if (!response.success || !response.data) {
                updatePending(message.clientId, { status: "failed", error: response.error?.[0]?.message ?? "Failed to send" });
                return;
            }
            const sent = response.data.message;
            setPending(prev => prev.filter(x => x.clientId !== message.clientId));
            if (channelIdRef.current === message.channelId) {
                setResults(prev => insertMessage(prev, { ...sent, clientId: message.clientId }));
            }
        });
    }, [socket]);

    const sendMessage = useCallback((content: string, repliedTo: ChannelMessageDetails | null) => {
        if (!channelId) return;

        const message: PendingMessage = {
            clientId: generateClientId(),
            channelId,
            content,
            repliedTo,
            createdAt: new Date().toISOString(),
            status: "sending"
        };
        setPending(prev => [message, ...prev]);
        emitPending(message);
    }, [channelId, emitPending]);

    const retryMessage = useCallback((clientId: string) => {
        const message = pending.find(x => x.clientId === clientId);
        if (!message || message.status !== "failed") return;
        updatePending(clientId, { status: "sending", error: undefined });
        emitPending(message);
    }, [pending, emitPending]);

    const cancelMessage = useCallback((clientId: string) => {
        setPending(prev => prev.filter(x => x.clientId !== clientId || x.status !== "failed"));
    }, []);

    const deleteMessage = useCallback((messageId: string) => {
        if (!socket) return;

        socket.emit("channels:delete_message", {
            channelId,
            messageId
        });
    }, [socket, channelId]);

    const editMessage = useCallback((messageId: string, content: string) => {
        if (!socket) return;

        socket.emit("channels:edit_message", {
            channelId,
            messageId,
            content
        });
    }, [socket, channelId]);

    return {
        isLoading,
        error,
        results,
        hasNextPage,
        pending,
        markMessagesSeen,
        sendMessage,
        retryMessage,
        cancelMessage,
        deleteMessage,
        editMessage
    };
};

export default useMessages;
