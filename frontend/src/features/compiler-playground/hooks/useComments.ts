import { useEffect, useState } from "react"
import { IComment } from "../components/CommentNode"
import {useApi} from "../../../context/apiCommunication"

const useComments = (options: { section: string; params: any; }, parentId: string | null, count: number, indices: { firstIndex: number, lastIndex: number, _state: number }, filter: number, repliesVisible: boolean, findPostId: string | null, defaultData: IComment[] | null) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IComment[]>(defaultData || [])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(true)

    const controller = new AbortController()

    const { signal } = controller

    const getComments = async (fromEnd: boolean) => {

        setIsLoading(true);

        const result = await sendJsonRequest(`/${options.section}/GetComments`, "POST", {
            ...options.params,
            parentId,
            index: fromEnd ? indices.lastIndex : Math.max(0, indices.firstIndex - count),
            count: fromEnd ? count : Math.min(indices.firstIndex, count),
            filter,
            findPostId
        },
            signal)

        if (signal.aborted) {
            setError("Something went wrong");
            return
        }

        if (result && result.posts) {

            let keepPrev = !fromEnd || indices.lastIndex > 0;
            setResults(prev => keepPrev ? fromEnd ? [...prev, ...result.posts] : [...result.posts, ...prev] : result.posts);
            if (fromEnd) {
                setHasNextPage(result.posts.length === count);
            }

        }

        setIsLoading(false);
    }

    useEffect(() => {
        if (repliesVisible && indices._state !== 0) {
            getComments(indices._state === 1);
        }

    }, [indices])

    const add = (data: IComment) => {
        setResults(prev => [data, ...prev]);
    }

    const set = (id: string, callback: (data: IComment) => IComment) => {
        setResults(prev => prev.map(item => {
            if (item.id === id) {
                return { ...callback(item) }
            }
            return item
        }));
    }

    const remove = (id: string) => {
        setResults(prev => {
            const results: IComment[] = [];
            let isAfterDeleted = false;
            for (let item of prev) {
                if (item.id === id) {
                    isAfterDeleted = true;
                }
                else {
                    results.push({ ...item, index: isAfterDeleted ? item.index - 1 : item.index });
                }
            }
            return results;
        });
    }

    return {
        results,
        isLoading,
        error,
        hasNextPage,
        add,
        set,
        remove
    }
}

export default useComments