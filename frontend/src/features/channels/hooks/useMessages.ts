import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useWS } from "../../../context/wsCommunication";
import { IChannelMessage } from "../components/ChannelMessage";
import { IChannelParticipant } from "../components/ChannelListItem";

const useMessages = (count: number, channelId: string | null, fromDate: Date | null, onChannelJoin: (user: IChannelParticipant) => void, onChannelLeave: (userId: string) => void, onMessagesSeen: (date: string) => void) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IChannelMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const { socket } = useWS();

    const fetchMessages = async (date: Date | null, replace: boolean) => {
        setIsLoading(true);
        setError("");

        const controller = new AbortController();
        const { signal } = controller;

        try {
            const result = await sendJsonRequest(`/Channels/Messages`, "POST", {
                fromDate: date,
                count,
                channelId
            }, { signal });

            if (!result || !result.messages) {
                if (!signal.aborted) setError("Something went wrong");
                setIsLoading(false);
                return;
            }

            setResults(prev =>
                replace ? result.messages : [...prev, ...result.messages]
            );
            setHasNextPage(result.messages.length === count);
        } finally {
            setIsLoading(false);
        }

        return () => controller.abort();
    };

    // Load on channel change (full reset)
    useEffect(() => {
        if (!channelId) return;
        fetchMessages(null, true);
    }, [channelId]);

    // Load more on pagination
    useEffect(() => {
        if (!channelId || fromDate === null) return;
        fetchMessages(fromDate, false);
    }, [fromDate]);

    // WebSocket listener for new messages
    useEffect(() => {
        if (!socket) return () => { };

        const handleNewMessage = (data: IChannelMessage) => {
            if (data.channelId === channelId) {
                if (data.type == 2) {
                    onChannelJoin({
                        userId: data.userId,
                        userName: data.userName,
                        userAvatar: data.userAvatar,
                        role: "Member"
                    });
                } else if (data.type == 3) {
                    onChannelLeave(data.userId);
                }
                setResults(prev => [data, ...prev]);
            }
        };

        const handleMessagesSeen = (data: any) => {
            onMessagesSeen(data.lastActiveAt);
        }

        socket.on("channels:new_message", handleNewMessage);
        socket.on("channels:messages_seen", handleMessagesSeen);

        return () => {
            socket.off("channels:new_message", handleNewMessage);
            socket.off("channels:messages_seen", handleMessagesSeen);
        }
    }, [socket, channelId]);

    const markMessagesSeen = useCallback(() => {
        if(!socket) return;

        socket.emit("channels:messages_seen", {
            channelId
        });
    }, [socket, channelId]);

    const sendMessage = useCallback((content: string) => {
        if(!socket) return;

        socket.emit("channels:send_message", {
            channelId,
            content
        });
    }, [socket, channelId]);

    return {
        isLoading,
        error,
        results,
        hasNextPage,
        markMessagesSeen,
        sendMessage
    };
};

export default useMessages;
