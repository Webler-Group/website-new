import { useEffect, useState } from "react";
import { IFeed } from "../components/types";
import { useApi } from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";

interface UseFeedState {
    page: number;
}

const useFeed = (filter: number, searchQuery: string, countPerPage: number) => {
    const [state, setState] = useState<UseFeedState>({ page: 0 });
    const [results, setResults] = useState<IFeed[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();

    useEffect(() => {
        if(state.page == 0) return;
        fetchFeeds();
    }, [state]);

    useEffect(() => {
        setState({ page: 1 });
    }, [filter, searchQuery]);

    const fetchFeeds = async () => {
            setError([]);
            setLoading(true);

            let keepPrev = state.page != 1;
            if(!keepPrev) {
                setResults([]);
            }

            const result = await sendJsonRequest("/Feed", "POST", {
                page: state.page,
                count: countPerPage,
                filter,
                searchQuery,
                userId: userInfo?.id
            });
            if (result && result.success) {
                if (keepPrev) {
                    setResults((prev) => {
                        // Filter out any posts that already exist in the results array to prevent duplicates
                        const newPosts = result.feeds.filter(
                            (newPost: IFeed) => !prev.some((existingPost) => existingPost.id === newPost.id)
                        );
                        return [...prev, ...newPosts];
                    });
                } else {
                    setResults(() => result.feeds);
                }
                setTotalCount(result.count);
                setHasNextPage(result.feeds.length === countPerPage);
            } else {
                setError(result.error);
            }

            setLoading(false);
        }

    const editPost = (updatedPost: IFeed) => {
        setResults(prev => prev.map(x => x.id == updatedPost.id ? updatedPost : x))
    }

    const deletePost = (id: string) => {
        setResults(prev => prev.filter(x => x.id != id));
    }

    const addPost = (post: IFeed) => {
        setResults(prev => [post, ...prev]);
    }

    return {
        state,
        results,
        loading,
        error,
        hasNextPage,
        totalCount,
        setState,
        editPost,
        deletePost,
        addPost
    }
}

export default useFeed;