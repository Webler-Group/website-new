import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../context/apiCommunication';
import { IUserReaction } from './UserReaction';

const useReactions = (parentId: string, countPerPage: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IUserReaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [state, setState] = useState({ page: 1 });

    const fetchData = useCallback(async () => {
        if (state.page == 0) return;

        setLoading(true);
        const response = await sendJsonRequest(
            "/Feed/GetUserReactions",
            'POST',
            { parentId, page: state.page, count: countPerPage }
        );

        setResults((prev) => [...prev, ...response.data]);
        setHasNextPage(response.data.length === countPerPage);
        setState((prev) => ({
            page: prev.page + 1
        }));
        setLoading(false);
    }, [parentId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setResults([]);
        setState({ page: 1 });
    }, [parentId]);

    return { results, loading, hasNextPage, setState };
};

export default useReactions;