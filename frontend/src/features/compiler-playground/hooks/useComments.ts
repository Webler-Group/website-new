import { useEffect, useState } from "react"
import { ICodeComment } from "../components/CommentNode"
import ApiCommunication from "../../../helpers/apiCommunication"

const useComments = (codeId: string, parentId: string | null, count: number, indices: { firstIndex: number, lastIndex: number }, filter: number, repliesVisible: boolean) => {

    const [results, setResults] = useState<ICodeComment[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(true)

    const controller = new AbortController()

    const { signal } = controller

    const getComments = async (fromEnd: boolean) => {

        setIsLoading(true);

        const result = await ApiCommunication.sendJsonRequest("/Discussion/GetCodeComments", "POST", {
            codeId,
            parentId,
            index: fromEnd ? indices.lastIndex : indices.firstIndex - count,
            count,
            filter
        },
            signal)

        if (signal.aborted) {
            setError("Something went wrong");
            return
        }

        if (result && result.posts) {

            let keepPrev = indices.lastIndex > 0;
            setResults(prev => keepPrev ? [...prev, ...result.posts] : result.posts);
            setHasNextPage(result.posts.length === count);
        }

        setIsLoading(false);
    }

    useEffect(() => {
        if (repliesVisible) {
            getComments(true)
        }

    }, [indices])

    const add = (data: ICodeComment) => {
        setResults(prev => [data, ...prev]);
    }

    const set = (id: string, callback: (data: ICodeComment) => ICodeComment) => {
        setResults(prev => prev.map(item => {
            if (item.id === id) {
                return { ...callback(item) }
            }
            return item
        }));
    }

    const remove = (id: string) => {
        setResults(prev => {
            const results: ICodeComment[] = [];
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