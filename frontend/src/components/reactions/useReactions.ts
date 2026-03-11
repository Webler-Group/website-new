import { useState, useEffect } from 'react';
import { useApi } from '../../context/apiCommunication';
import { UserReaction, UserReactionsListData } from '../../features/feed/types';

const useReactions = (options: { parentId: string | null }, countPerPage: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<UserReaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [error, setError] = useState<{ message: string }[] | undefined>();
    const [state, setState] = useState({ page: 1 });

    useEffect(() => {
        const fetchData = async () => {
            if (state.page == 0 || !options.parentId) return;

            setError(undefined);
            setLoading(true);
            const result = await sendJsonRequest<UserReactionsListData>(
                "/Feed/GetUserReactions",
                'POST',
                { parentId: options.parentId, page: state.page, count: countPerPage }
            );

            if (result.data) {
                const reactions = result.data.userReactions;
                setResults((prev) => state.page == 1 ? reactions : [...prev, ...reactions]);
                setHasNextPage(result.data.userReactions.length === countPerPage);
            } else {
                setError(result.error);
            }
            setLoading(false);
        }

        fetchData();
    }, [state]);

    useEffect(() => {
        setResults([]);
        setState({ page: 1 });
    }, [options]);

    return { results, loading, hasNextPage, error, setState };
};

export default useReactions;