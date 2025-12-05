import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { IChannel } from "../components/ChannelListItem";
import { useWS } from "../../../context/wsCommunication";
import { useAuth } from "../../auth/context/authContext";

const useChannels = (
    count: number,
    fromDate: Date | null,
    onLeaveChannel?: (channelId: string) => void
) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IChannel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const { socket } = useWS();
    const resultsRef = useRef<IChannel[]>([]);
    const { userInfo } = useAuth();
    const onLeaveChannelRef = useRef(onLeaveChannel);

    useEffect(() => {
        onLeaveChannelRef.current = onLeaveChannel;
    }, [onLeaveChannel]);

    useEffect(() => {
        resultsRef.current = results;
    }, [results]);

    // Load initial channels
    useEffect(() => {

        const fetchChannels = async () => {
            setIsLoading(true);
            setError("");

            const result = await sendJsonRequest(
                `/Channels`,
                "POST",
                { fromDate, count }
            );

            if (result && result.channels) {
                setResults(prev => [...prev, ...result.channels]);
                setHasNextPage(result.channels.length === count);
            } else {
                setError(result?.error[0].message ?? "Something went wrong");
            }

            setIsLoading(false);
        };

        fetchChannels();
    }, [fromDate]);

    // WebSocket listeners
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = async (data: any) => {
            const existing = resultsRef.current.find(
                x => x.id === data.channelId
            );

            if (data.type === 3 && data.userId === userInfo?.id) {
                setResults(prev => prev.filter(x => x.id !== data.channelId));
                onLeaveChannelRef.current?.(data.channelId);
                return;
            }

            if (!existing) {
                const result = await sendJsonRequest(
                    "/Channels/GetChannel",
                    "POST",
                    { channelId: data.channelId }
                );

                if (result && result.channel) {
                    setResults(prev => [
                        { ...result.channel, lastMessage: data },
                        ...prev,
                    ]);
                }
            } else {
                setResults(prev => {
                    const updated = prev.map(ch =>
                        ch.id === data.channelId
                            ? {
                                ...ch,
                                updatedAt: data.createdAt,
                                unreadCount: ch.unreadCount + 1,
                                lastMessage: data,
                                title:
                                    data.type == 4
                                        ? data.channelTitle
                                        : ch.title,
                            }
                            : ch
                    );
                    const channelToMove = updated.find(
                        ch => ch.id === data.channelId
                    );
                    const others = updated.filter(
                        ch => ch.id !== data.channelId
                    );
                    return channelToMove
                        ? [channelToMove, ...others]
                        : updated;
                });
            }
        };

        const handleMessagesSeen = (data: any) => {
            setResults(prev =>
                prev.map(ch =>
                    ch.id === data.channelId
                        ? {
                            ...ch,
                            lastMessage: ch.lastMessage
                                ? { ...ch.lastMessage, viewed: true }
                                : undefined,
                            unreadCount: 0,
                        }
                        : ch
                )
            );
        };

        const handleChannelDeleted = (data: any) => {
            setResults(prev => prev.filter(x => x.id !== data.channelId));
            onLeaveChannelRef.current?.(data.channelId);
        };

        const handleMessageDeleted = (data: any) => {
            setResults(prev =>
                prev.map(ch =>
                    ch.id === data.channelId
                        ? {
                            ...ch,
                            lastMessage:
                                ch.lastMessage &&
                                    ch.lastMessage.id == data.messageId
                                    ? {
                                        ...ch.lastMessage,
                                        deleted: true,
                                        content: "",
                                    }
                                    : undefined,
                        }
                        : ch
                )
            );
        };

        const handleMessageEdited = (data: any) => {
            setResults(prev =>
                prev.map(ch =>
                    ch.id === data.channelId
                        ? {
                            ...ch,
                            lastMessage:
                                ch.lastMessage &&
                                    ch.lastMessage.id == data.messageId
                                    ? {
                                        ...ch.lastMessage,
                                        content: data.content,
                                    }
                                    : undefined,
                        }
                        : ch
                )
            );
        };

        socket.on("channels:new_message", handleNewMessage);
        socket.on("channels:messages_seen", handleMessagesSeen);
        socket.on("channels:channel_deleted", handleChannelDeleted);
        socket.on("channels:message_deleted", handleMessageDeleted);
        socket.on("channels:message_edited", handleMessageEdited);

        return () => {
            socket.off("channels:new_message", handleNewMessage);
            socket.off("channels:messages_seen", handleMessagesSeen);
            socket.off("channels:channel_deleted", handleChannelDeleted);
            socket.off("channels:message_deleted", handleMessageDeleted);
            socket.off("channels:message_edited", handleMessageEdited);
        };
    }, [socket]);

    const addChannel = (data: IChannel) => {
        setResults(prev => [data, ...prev]);
    };

    return {
        isLoading,
        error,
        results,
        hasNextPage,
        addChannel,
    };
};

export default useChannels;
