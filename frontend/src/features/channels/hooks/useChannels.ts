import { useEffect, useState } from "react";
import {useApi} from "../../../context/apiCommunication";
import { IChannel } from "../components/ChannelListItem";

const useChannels = (count: number, pageNum: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IChannel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setError("");

        const controller = new AbortController();
        const { signal } = controller;

        sendJsonRequest(`/Channels`, "POST", {
            page: pageNum,
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
            })

        return () => controller.abort();

    }, [pageNum]);

    const addChannel = (data: IChannel) => {
        setResults(prev => [data, ...prev]);
    }

    return { 
        isLoading, 
        error, 
        results, 
        hasNextPage, 
        addChannel,
    }
}

export default useChannels;