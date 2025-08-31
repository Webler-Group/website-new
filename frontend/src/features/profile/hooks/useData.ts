import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"

const useData = (loadUrlPath: string | null, params: any, count: number, store: { page: number; }) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(false)

    useEffect(() => {
        if(store.page == 0 || !loadUrlPath) return;

        setIsLoading(true)
        setError("")

        const controller = new AbortController()
        const { signal } = controller

        sendJsonRequest(`${loadUrlPath}`, "POST", {
            ...params,
            count,
            page: store.page
        }, { signal })
            .then(result => {
                if (!result || !result.data) {
                    setIsLoading(false)
                    if (signal.aborted) return
                    setError("Something went wrong");
                    return
                }
                if(store.page == 1) {
                    setResults(result.data)
                } else {
                    setResults(prev => [...prev, ...result.data])
                }
                setHasNextPage(result.data.length === count)
                setIsLoading(false)
            })

        return () => controller.abort()

    }, [store])

    return { isLoading, error, results, hasNextPage }
}

export default useData;