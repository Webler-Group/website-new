import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import { FeedDetails, FeedListData } from "../types";

interface UseFeedState {
    page: number;
}

const useFeed = (filter: number, searchQuery: string, countPerPage: number) => {
    const [state, setState] = useState<UseFeedState>({ page: 0 });
    const [results, setResults] = useState<FeedDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<{ message: string }[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();

    useEffect(() => {
        if (state.page == 0) return;
        fetchFeeds();
    }, [state]);

    useEffect(() => {
        setState({ page: 1 });
    }, [filter, searchQuery]);

    const fetchFeeds = async () => {
        setError([]);
        setLoading(true);

        const keepPrev = state.page !== 1;

        const result = await sendJsonRequest<FeedListData>("/Feed", "POST", {
            page: state.page,
            count: countPerPage,
            filter,
            searchQuery,
            userId: userInfo?.id
        });

        if (result.data) {
            if (keepPrev) {
                setResults((prev) => {
                    const newPosts = result.data!.feeds.filter(
                        (newPost) => !prev.some((existingPost) => existingPost.id === newPost.id)
                    );
                    return [...prev, ...newPosts];
                });
            } else {
                setResults(result.data.feeds);
            }
            setTotalCount(result.data.count);
            setHasNextPage(result.data.feeds.length === countPerPage);
        } else {
            setError(result.error ?? []);
        }

        setLoading(false);
    };

    const editPost = (updatedPost: FeedDetails) => {
        setResults(prev => prev.map(x => x.id == updatedPost.id ? updatedPost : x))
    }

    const deletePost = (id: string) => {
        setResults(prev => prev.filter(x => x.id != id));
    }

    const addPost = (post: FeedDetails) => {
        setResults(prev => prev.some(x => x.id === post.id) ? prev : [post, ...prev]);
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