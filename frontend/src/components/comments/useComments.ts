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

const useComments = (options: UseCommentsOptions, findPostId: string | null, filter: number, countPerPage: number, showAllComments: boolean) => {
    const [state, setState] = useState<UseCommentsState>({
        firstIndex: 0,
        lastIndex: 0,
        direction: 'dont load',
    });
    const [results, setResults] = useState<IComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [initialFetchDone, setInitialFetchDone] = useState(false);
    const [error, setError] = useState("");
    const { sendJsonRequest } = useApi();

    const fetchComments = useCallback(async () => {
        if (state.direction === 'dont load') return;

        setError("");
        setLoading(true);
        const result = await sendJsonRequest(`/${options.section}/GetComments`, 'POST', {
            ...options.params,
            parentId: null,
            findPostId: (initialFetchDone || showAllComments) ? null : findPostId,
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
        } else {
            setError(result?.message ?? "Something went wrong");
        }
        setLoading(false);
    }, [state]);

    const createComment = (post: IComment) => {
        setResults((prev) => [post, ...prev]);
    }

    const editComment = (id: string, setter: (prev: IComment) => IComment) => {
        setResults(prev => prev.map(x => x.id == id ? setter(x) : x));
    }

    const deleteComment = (postId: string) => {
        setResults(prev => {
            const results: IComment[] = [];
            let isAfterDeleted = false;
            for (let x of prev) {
                if (x.id === postId) {
                    isAfterDeleted = true;
                }
                else {
                    results.push({ ...x, index: isAfterDeleted ? x.index - 1 : x.index });
                }
            }
            return results;
        });
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
    }, [options, findPostId, filter, showAllComments]);

    return { results, setState, loading, createComment, editComment, deleteComment, hasNextPage, getFirstValidCommentIndex, error };
};

export type {
    UseCommentsOptions,
    UseCommentsState
}

export default useComments;