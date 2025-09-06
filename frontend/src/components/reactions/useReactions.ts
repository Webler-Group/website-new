import { useState, useEffect } from 'react';
import { useApi } from '../../context/apiCommunication';
import { IUserReaction } from './ReactionListItem';

const useReactions = (options: { parentId: string | null }, countPerPage: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IUserReaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [error, setError] = useState("");
    const [state, setState] = useState({ page: 1 });

    useEffect(() => {
        const fetchData = async () => {
            if (state.page == 0 || !options.parentId) return;

            setError("");
            setLoading(true);
            const result = await sendJsonRequest(
                "/Feed/GetUserReactions",
                'POST',
                { parentId: options.parentId, page: state.page, count: countPerPage }
            );

            if (result && result.userReactions) {
                setResults((prev) => state.page == 1 ? result.userReactions : [...prev, ...result.userReactions]);
                setHasNextPage(result.userReactions.length === countPerPage);
            } else {
                setError("Something went wrong")
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