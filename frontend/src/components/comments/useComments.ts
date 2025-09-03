import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../context/apiCommunication";
import { IComment } from "./Comment";

interface UseCommentsOptions {
    section: string;
    params: any;
}

interface UseCommentsState {
    firstIndex: number;
    lastIndex: number;
    direction: 'from start' | 'from end' | 'dont load';
}

const useComments = (options: UseCommentsOptions, findPostId: string | null, filter: number, countPerPage: number) => {
    const [state, setState] = useState<UseCommentsState>({
        firstIndex: 0,
        lastIndex: 0,
        direction: 'dont load',
    });
    const [results, setResults] = useState<IComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [initialFetchDone, setInitialFetchDone] = useState(false);
    const { sendJsonRequest } = useApi();

    const fetchComments = useCallback(async () => {
        if (state.direction === 'dont load') return;

        setLoading(true);
        try {
            const result = await sendJsonRequest(`/${options.section}/GetComments`, 'POST', {
                ...options.params,
                parentId: null,
                findPostId: initialFetchDone ? null : findPostId,
                count: state.direction === 'from start' ? Math.min(state.firstIndex, countPerPage) : countPerPage,
                index: state.direction === 'from start' ? Math.max(0, state.firstIndex - countPerPage) : state.lastIndex,
                filter,
            });
            if (result && result.posts) {
                setResults((prev) => {
                    // Filter out any posts that already exist in the results array to prevent duplicates
                    const newPosts = result.posts.filter(
                        (newPost: IComment) => !prev.some((existingPost) => existingPost.id === newPost.id)
                    );
                    return state.direction === 'from start'
                        ? [...newPosts, ...prev]
                        : [...prev, ...newPosts]
                });
                if (state.direction === 'from end') {
                    setHasNextPage(result.posts.length === countPerPage);
                }
                setInitialFetchDone(true);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    }, [state.direction, state.firstIndex, state.lastIndex, options, findPostId, filter]);

    const createComment = (post: IComment) => {
        setResults((prev) => [{ ...post, index: -1 }, ...prev]);
    }

    const getFirstValidCommentIndex = useCallback(() => {
        const validComment = results.find(comment => comment.index >= 0);
        return validComment ? validComment.index : 0;
    }, [results]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    useEffect(() => {
        setState({ firstIndex: 0, lastIndex: 0, direction: 'from end' });
        setResults([]);
        setHasNextPage(false);
    }, [options.section, options.params, findPostId, filter]);

    return { results, setState, loading, createComment, hasNextPage, getFirstValidCommentIndex };
};

export type {
    UseCommentsOptions,
    UseCommentsState
}

export default useComments;