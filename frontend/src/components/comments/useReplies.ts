import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../context/apiCommunication";
import { IComment } from "./Comment";
import { UseCommentsOptions, UseCommentsState } from "./useComments";

const useReplies = (options: UseCommentsOptions, repliesVisible: boolean, parentId: string, defaultData: IComment[] | null, countPerPage: number) => {
    const [state, setState] = useState<UseCommentsState>({
        firstIndex: defaultData && defaultData.length > 0 ? defaultData[0].index : 0,
        lastIndex: defaultData && defaultData.length > 0 ? defaultData[defaultData.length - 1].index : 0,
        direction: defaultData && defaultData.length > 0 ? 'dont load' : 'dont load',
    });
    const [results, setResults] = useState<IComment[]>(defaultData || []);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(false);
    const { sendJsonRequest } = useApi();

    const getFirstValidCommentIndex = useCallback(() => {
        const validComment = results.find(comment => comment.index >= 0);
        return validComment ? validComment.index : 0;
    }, [results]);

    const fetchReplies = useCallback(async () => {
        if (state.direction === 'dont load' || !repliesVisible) return;

        setLoading(true);
        try {
            const result = await sendJsonRequest(`/${options.section}/GetComments`, 'POST', {
                ...options.params,
                parentId,
                findPostId: null,
                count: state.direction === 'from start' ? Math.min(state.firstIndex, countPerPage) : countPerPage,
                index: state.direction === 'from start' ? Math.max(0, state.firstIndex - countPerPage) : state.lastIndex,
                filter: 2,
            });
            if (result && result.posts) {
                setResults((prev) => {
                    const newPosts = result.posts.filter(
                        (newPost: IComment) => !prev.some((existingPost) => existingPost.id === newPost.id)
                    );
                    return state.direction === 'from start'
                        ? [...newPosts, ...prev]
                        : [...prev, ...newPosts];
                });
                if (state.direction === 'from end') {
                    setHasNextPage(result.posts.length === countPerPage);
                }
            }
        } catch (error) {
            console.error('Error fetching replies:', error);
        } finally {
            setLoading(false);
        }
    }, [state.direction, state.firstIndex, state.lastIndex, options, parentId, repliesVisible]);

    const createReply = (post: IComment) => {
        setResults((prev) => [{ ...post, index: -1 }, ...prev]);
    }

    useEffect(() => {
        fetchReplies();
    }, [fetchReplies]);

    useEffect(() => {
        if (!repliesVisible) {
            setState({
                firstIndex: defaultData && defaultData.length > 0 ? defaultData[0].index : 0,
                lastIndex: defaultData && defaultData.length > 0 ? defaultData[defaultData.length - 1].index : 0,
                direction: defaultData && defaultData.length > 0 ? 'dont load' : 'from end',
            });
            setResults(defaultData || []);
            setHasNextPage(false);
        }
    }, [options.section, options.params, parentId, defaultData, repliesVisible]);

    return { results, setState, loading, hasNextPage, createReply, getFirstValidCommentIndex };
};

export default useReplies;