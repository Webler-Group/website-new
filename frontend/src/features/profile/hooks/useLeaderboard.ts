import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { LeaderboardData, LeaderboardEntry, LeaderboardPeriod } from "../types";

const useLeaderboard = (period: LeaderboardPeriod, countPerPage: number) => {
    const { sendJsonRequest } = useApi();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    // The page belongs to a period, so switching the period starts at page 1 in the same render
    const [pageState, setPageState] = useState({ period, page: 1 });
    const page = pageState.period === period ? pageState.page : 1;
    // Ignores responses of requests made for a previous period
    const requestIdRef = useRef(0);

    useEffect(() => {
        const requestId = ++requestIdRef.current;
        const fetchEntries = async () => {
            if (page === 1) {
                setEntries([]);
                setHasNextPage(false);
            }
            setIsLoading(true);
            setError("");
            const result = await sendJsonRequest<LeaderboardData>("/Profile/GetLeaderboard", "POST", {
                period,
                page,
                count: countPerPage
            });
            if (requestId !== requestIdRef.current) return;
            if (result.data) {
                const newEntries = result.data.entries;
                setEntries(prev => page === 1 ? newEntries : [...prev, ...newEntries]);
                setHasNextPage(newEntries.length === countPerPage);
            } else {
                setError(result.error?.[0]?.message ?? "Something went wrong");
            }
            setIsLoading(false);
        };
        fetchEntries();
    }, [period, page]);

    const loadNextPage = useCallback(() => setPageState({ period, page: page + 1 }), [period, page]);

    return { isLoading, error, entries, hasNextPage, loadNextPage };
};

export default useLeaderboard;
