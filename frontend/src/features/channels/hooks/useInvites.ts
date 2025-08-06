import { useEffect, useState } from "react";
import {useApi} from "../../../context/apiCommunication";
import { IChannelInvite } from "../components/InvitesListItem";

const useInvites = (count: number, pageNum: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IChannelInvite[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setError("");

        const controller = new AbortController();
        const { signal } = controller;

        sendJsonRequest(`/Channels/Invites`, "POST", {
            page: pageNum,
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
                setHasNextPage(result.invites.length === count);
                setIsLoading(false);
            })

        return () => controller.abort();

    }, [pageNum]);

    const add = (data: IChannelInvite) => {
        setResults(prev => [data, ...prev]);
    }

    const remove = (id: string) => {
        setResults(prev => prev.filter(x => x.id !== id));
    }

    return { 
        isLoading, 
        error, 
        results, 
        hasNextPage, 
        add,
        remove
    }
}

export default useInvites;