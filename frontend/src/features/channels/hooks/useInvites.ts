import { useEffect, useState } from "react";
import {useApi} from "../../../context/apiCommunication";
import { IChannelInvite } from "../components/InvitesListItem";
import { useWS } from "../../../context/wsCommunication";

const useInvites = (count: number, fromDate: Date | null) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IChannelInvite[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const { socket } = useWS();

    useEffect(() => {
        setIsLoading(true);
        setError("");

        const controller = new AbortController();
        const { signal } = controller;

        sendJsonRequest(`/Channels/Invites`, "POST", {
            fromDate,
            count
        }, { signal })
            .then(result => {
                if (!result || !result.invites) {
                    setIsLoading(false);
                    if (signal.aborted) return;
                    setError("Something went wrong");
                    return;
                }
                setResults(prev => [...prev, ...result.invites]);
                setTotalCount(result.count);
                setHasNextPage(result.invites.length === count);
                setIsLoading(false);
            })

        return () => controller.abort();

    }, [fromDate]);

    useEffect(() => {
        if (!socket) return;

        const handleNewInvite = (data: any) => {
            setResults(prev => [data, ...prev]);
            setTotalCount(prev => prev + 1);
        }

        const handleInviteCanceled = (data: any) => {
            setResults(prev => prev.filter(x => x.id != data.inviteId));
            setTotalCount(prev => prev - 1);
        }

        socket.on("channels:new_invite", handleNewInvite);
        socket.on("channels:invite_canceled", handleInviteCanceled);

        return () => {
            socket.off("channels:new_invite", handleNewInvite);
            socket.off("channels:invite_canceled", handleInviteCanceled);
        };
    }, [socket]);

    const add = (data: IChannelInvite) => {
        setResults(prev => [data, ...prev]);
    }

    const remove = (id: string) => {
        setResults(prev => prev.filter(x => x.id !== id));
        setTotalCount(prev => prev - 1);
    }

    return { 
        isLoading, 
        error, 
        results,
        totalCount,
        hasNextPage, 
        add,
        remove
    }
}

export default useInvites;