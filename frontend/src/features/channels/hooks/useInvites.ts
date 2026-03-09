import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useWS } from "../../../context/wsCommunication";
import { ChannelBase, InviteDetails, InvitesListData } from "../types";

const useInvites = (count: number, fromDate: Date | null) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<InviteDetails<undefined, ChannelBase>[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const { socket } = useWS();

    useEffect(() => {

        const fetchInvites = async () => {
            setIsLoading(true);
            setError("");

            const result = await sendJsonRequest<InvitesListData>(
                `/Channels/Invites`,
                "POST",
                { fromDate, count }
            );

            if (result.data) {
                setResults(prev => [...prev, ...result.data!.invites]);
                setTotalCount(result.data.count);
                setHasNextPage(result.data.invites.length === count);
            } else {
                setError(result.error?.[0].message ?? "Something went wrong");
            }

            setIsLoading(false);
        };

        fetchInvites();
    }, [fromDate]);

    useEffect(() => {
        if (!socket) return;

        const handleNewInvite = (data: any) => {
            setResults(prev => [data, ...prev]);
            setTotalCount(prev => prev + 1);
        };

        const handleInviteCanceled = (data: any) => {
            setResults(prev => prev.filter(x => x.id !== data.inviteId));
            setTotalCount(prev => prev - 1);
        };

        socket.on("channels:new_invite", handleNewInvite);
        socket.on("channels:invite_canceled", handleInviteCanceled);

        return () => {
            socket.off("channels:new_invite", handleNewInvite);
            socket.off("channels:invite_canceled", handleInviteCanceled);
        };
    }, [socket]);

    const add = (data: InviteDetails<undefined, ChannelBase>) => {
        setResults(prev => [data, ...prev]);
    };

    const remove = (id: string) => {
        setResults(prev => prev.filter(x => x.id !== id));
        setTotalCount(prev => prev - 1);
    };

    return {
        isLoading,
        error,
        results,
        totalCount,
        hasNextPage,
        add,
        remove,
    };
};

export default useInvites;
