import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"

const useFollows = (loadUrlPath: string, userId: string, count: number, pageNum = 1) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(false)

    useEffect(() => {
        setResults([]);
    }, [loadUrlPath]);

    useEffect(() => {
        setIsLoading(true)
        setError("")

        const controller = new AbortController()
        const { signal } = controller

        sendJsonRequest(`${loadUrlPath}`, "POST", {
            userId,
            count,
            page: pageNum
        }, { signal })
            .then(result => {
                if (!result || !result.data) {
                    setIsLoading(false)
                    if (signal.aborted) return
                    setError("Something went wrong");
                    return
                }
                setResults(prev => [...prev, ...result.data])
                setHasNextPage(result.data.length === count)
                setIsLoading(false)
            })

        return () => controller.abort()

    }, [pageNum])

    return { isLoading, error, results, hasNextPage }
}

export default useFollows;