import { useEffect, useState } from "react"
import { ICodeComment } from "../components/CommentNode"
import ApiCommunication from "../../../helpers/apiCommunication"

const useComments = (codeId: string, parentId: string | null, count: number, firstIndex: number, lastIndex: { index: number; }, filter: number, repliesVisible: boolean) => {

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
            index: fromEnd ? lastIndex.index : firstIndex - count,
            count,
            filter
        },
            signal)

        if (signal.aborted) {
            setError("Something went wrong");
            return
        }

        if (result && result.posts) {

            let keepPrev = lastIndex.index > 0;
            setResults(prev => keepPrev ? [...prev, ...result.posts] : result.posts);
            setHasNextPage(result.posts.length === count);
        }

        setIsLoading(false);
    }

    useEffect(() => {
        if (repliesVisible) {
            getComments(true)
        }
    }, [lastIndex])

    const add = (data: ICodeComment) => {
        setResults(prev => [data, ...prev]);
    }

    return {
        results,
        isLoading,
        error,
        hasNextPage,
        add
    }
}

export default useComments