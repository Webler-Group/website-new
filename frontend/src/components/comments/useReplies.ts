import { useEffect, useState } from "react";
import { useApi } from "../../context/apiCommunication";
import { IComment } from "./Comment";
import { UseCommentsOptions, UseCommentsState } from "./useComments";

const useReplies = (options: UseCommentsOptions, repliesVisible: boolean, parentId: string, defaultData: IComment[] | null, countPerPage: number) => {
    const [state, setState] = useState<UseCommentsState>({
        firstIndex: defaultData && defaultData.length > 0 ? defaultData[0].index : 0,
        lastIndex: defaultData && defaultData.length > 0 ? defaultData[defaultData.length - 1].index : 0,
        direction: 'dont load'
    });
    const [results, setResults] = useState<IComment[]>(defaultData || []);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(defaultData !== null && defaultData.length == countPerPage);
    const { sendJsonRequest } = useApi();

    useEffect(() => {
        const fetchReplies = async () => {
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
        }

        fetchReplies();
    }, [state]);

    useEffect(() => {
        if (repliesVisible) {
            setState(prev => ({ ...prev, direction: defaultData !== null ? 'dont load' : 'from end' }));
        }
    }, [options, parentId, defaultData, repliesVisible]);

    const getFirstValidCommentIndex = () => {
        const validComment = results.find(comment => comment.index >= 0);
        return validComment ? validComment.index : 0;
    }

    const createReply = (post: IComment) => {
        setResults((prev) => [post, ...prev]);
    }

    const editReply = (id: string, setter: (prev: IComment) => IComment) => {
        setResults(prev => prev.map(x => x.id == id ? setter(x) : x));
    }

    const deleteReply = (postId: string) => {
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

    return { results, setState, loading, hasNextPage, createReply, editReply, deleteReply, getFirstValidCommentIndex };
};

export default useReplies;