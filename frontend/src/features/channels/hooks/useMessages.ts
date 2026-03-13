import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useWS } from "../../../context/wsCommunication";
import { ChannelMessageDetails, ChannelMessagesListData, ChannelParticipantDetails, MessageDeletedData, MessageEditedData, MessagesSeenData, NewMessageData } from "../types";
import ChannelMessageTypeEnum from "../../../data/ChannelMessageTypeEnum";
import ChannelRolesEnum from "../../../data/ChannelRolesEnum";

const useMessages = (count: number, channelId: string | null, fromDate: Date | null, onChannelJoin: (user: ChannelParticipantDetails) => void, onChannelLeave: (userId: string) => void, onMessagesSeen: (date: string) => void) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<ChannelMessageDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const { socket } = useWS();

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
                setResults(prev => [newMessage, ...prev]);
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

    const sendMessage = useCallback((content: string, repliedTo: ChannelMessageDetails | null) => {
        if (!socket) return;

        socket.emit("channels:send_message", {
            channelId,
            content,
            repliedTo: repliedTo && repliedTo.id,
        });
    }, [socket, channelId]);

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
        markMessagesSeen,
        sendMessage,
        deleteMessage,
        editMessage
    };
};

export default useMessages;
