import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useWS } from "../../../context/wsCommunication";
import { useAuth } from "../../auth/context/authContext";
import { ChannelDeletedData, ChannelMinimal, ChannelsListData, GetChannelData, MessageDeletedData, MessageEditedData, MessagesSeenData, NewMessageData } from "../types";
import ChannelMessageTypeEnum from "../../../data/ChannelMessageTypeEnum";

const useChannels = (
    count: number,
    fromDate: Date | null,
    onLeaveChannel?: (channelId: string) => void
) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<ChannelMinimal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const { socket } = useWS();
    const resultsRef = useRef<ChannelMinimal[]>([]);
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

            const result = await sendJsonRequest<ChannelsListData>(
                `/Channels`,
                "POST",
                { fromDate, count }
            );

            if (result.data) {
                setResults(prev => [...prev, ...result.data!.channels]);
                setHasNextPage(result.data.channels.length === count);
            } else {
                setError(result.error?.[0].message ?? "Something went wrong");
            }

            setIsLoading(false);
        };

        fetchChannels();
    }, [fromDate]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = async (data: NewMessageData) => {
            const newMessage = data.message;

            const existing = resultsRef.current.find(
                x => x.id === newMessage.channel.id
            );

            if (newMessage.type === ChannelMessageTypeEnum.USER_LEFT && newMessage.user.id === userInfo?.id) {
                setResults(prev => prev.filter(x => x.id !== newMessage.channel.id));
                onLeaveChannelRef.current?.(newMessage.channel.id);
                return;
            }

            if (!existing) {
                const result = await sendJsonRequest<GetChannelData>(
                    "/Channels/GetChannel",
                    "POST",
                    { channelId: newMessage.channel.id }
                );

                if (result.data) {
                    setResults(prev => [
                        { ...result.data!.channel, lastMessage: newMessage },
                        ...prev,
                    ]);
                }
            } else {
                setResults(prev => {
                    const updated = prev.map(channel =>
                        channel.id === newMessage.channel.id
                            ? {
                                ...channel,
                                updatedAt: newMessage.createdAt,
                                unreadCount: channel.unreadCount + 1,
                                lastMessage: newMessage,
                                title:
                                    newMessage.type == ChannelMessageTypeEnum.TITLE_CHANGED
                                        ? newMessage.channel.title
                                        : channel.title,
                            }
                            : channel
                    );
                    const channelToMove = updated.find(
                        ch => ch.id === newMessage.channel.id
                    );
                    const others = updated.filter(
                        ch => ch.id !== newMessage.channel.id
                    );
                    return channelToMove
                        ? [channelToMove, ...others]
                        : updated;
                });
            }
        };

        const handleMessagesSeen = (data: MessagesSeenData) => {
            setResults(prev =>
                prev.map(ch =>
                    ch.id === data.channelId
                        ? {
                            ...ch,
                            lastMessage: ch.lastMessage
                                ? { ...ch.lastMessage, viewed: true }
                                : null,
                            unreadCount: 0,
                        }
                        : ch
                )
            );
        };

        const handleChannelDeleted = (data: ChannelDeletedData) => {
            setResults(prev => prev.filter(x => x.id !== data.channelId));
            onLeaveChannelRef.current?.(data.channelId);
        };

        const handleMessageDeleted = (data: MessageDeletedData) => {
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
                                    : null,
                        }
                        : ch
                )
            );
        };

        const handleMessageEdited = (data: MessageEditedData) => {
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
                                    : null,
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

    const addChannel = (data: ChannelMinimal) => {
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
