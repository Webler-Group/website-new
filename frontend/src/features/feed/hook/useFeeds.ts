import { useEffect, useState } from "react";
import { IFeed } from "../components/types";
import { useApi } from "../../../context/apiCommunication";

const useFeed = (count: number, page: { page: number; _state: number; }, filter: number) => {
    const [results, setResults] = useState<IFeed[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const { sendJsonRequest } = useApi();
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(true)

    const controller = new AbortController()
    const { signal } = controller

    useEffect(() => {
        if(page._state != 0) {
            getFeeds();
        }
    }, [page]);

    const getFeeds = async () => {

        setIsLoading(true);

        const result = await sendJsonRequest("/Feed", "POST", {
            count,
            page: page.page,
            filter,
            searchQuery: ""
        },
            signal)

        if (signal.aborted) {
            setError("Something went wrong");
            return
        }

        if (result && result.success) {
            if(page.page == 1) {
                setResults(result.feeds)
            } else {
                setResults(prev => [...prev, ...result.feeds])
            }
            setTotalCount(result.count)
            setHasNextPage(result.feeds.length === count)
        }

        setIsLoading(false);
    }

    const addFeed = (feed: IFeed) => {
        setResults(prev => [feed, ...prev]);
    }

    const deleteFeed = (feedId: string) => {
        setResults(prev => prev.filter(x => x.id != feedId));
    }

    const editFeed = (feed: IFeed) => {
        setResults(prev => prev.map(x => x.id == feed.id ? { ...x, message: feed.message, isPinned: feed.isPinned } : x))
    }

    return {
        results,
        isLoading,
        error,
        hasNextPage,
        totalCount,
        addFeed,
        deleteFeed,
        editFeed
    }
}

export default useFeed;