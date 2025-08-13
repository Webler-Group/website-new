import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { IChannel } from "../components/ChannelListItem";
import { useWS } from "../../../context/wsCommunication";
import { useAuth } from "../../auth/context/authContext";

const useChannels = (count: number, fromDate: Date | null, onLeaveChannel?: (channelId: string) => void) => {
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
        setIsLoading(true);
        setError("");

        const controller = new AbortController();
        const { signal } = controller;

        sendJsonRequest(`/Channels`, "POST", {
            fromDate,
            count
        }, { signal })
            .then(result => {
                if (!result || !result.channels) {
                    setIsLoading(false);
                    if (signal.aborted) return;
                    setError("Something went wrong");
                    return;
                }
                setResults(prev => [...prev, ...result.channels]);
                setHasNextPage(result.channels.length === count);
                setIsLoading(false);
            });

        return () => controller.abort();
    }, [fromDate]);

    // Handle new message events
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = async (data: any) => {
            const existing = resultsRef.current.find(x => x.id === data.channelId);

            if (data.type === 3 && data.userId === userInfo?.id) {
                setResults(prev => prev.filter(x => x.id !== data.channelId));
                onLeaveChannelRef.current?.(data.channelId);
                return;
            }

            if (!existing) {
                // Channel not loaded yet — fetch it
                const result = await sendJsonRequest("/Channels/GetChannel", "POST", {
                    channelId: data.channelId
                });
                if (result && result.channel) {
                    setResults(prev => [{ ...result.channel, lastMessage: data }, ...prev]);
                }
            } else {
                // Move channel to the top & update lastMessage
                setResults(prev => {
                    const updated = prev.map(ch =>
                        ch.id === data.channelId
                            ? { ...ch, updatedAt: data.createdAt, lastMessage: data }
                            : ch
                    );
                    const channelToMove = updated.find(ch => ch.id === data.channelId);
                    const others = updated.filter(ch => ch.id !== data.channelId);
                    return channelToMove ? [channelToMove, ...others] : updated;
                });
            }
        };

        const handleMessagesSeen = (data: any) => {
            
            setResults(prev => {
                for(let i = 0; i < prev.length; ++i) {
                    if(prev[i].id == data.channelId) {
                        if(prev[i].lastMessage) {
                            prev[i].lastMessage!.viewed = true;
                        }
                    }
                }
                return prev;
            });
        }

        socket.on("channels:new_message", handleNewMessage);
        socket.on("channels:messages_seen", handleMessagesSeen);

        return () => {
            socket.off("channels:new_message", handleNewMessage);
            socket.off("channels:messages_seen", handleMessagesSeen);
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
