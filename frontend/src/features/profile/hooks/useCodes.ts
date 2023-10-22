import { useEffect, useState } from "react"
import ApiCommunication from "../../../helpers/apiCommunication"

const useCodes = (userId: string, count: number, pageNum: number) => {
    const [results, setResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(false)

    useEffect(() => {
        setIsLoading(true)
        setError("")

        const controller = new AbortController()
        const { signal } = controller

        ApiCommunication.sendJsonRequest(`/Codes`, "POST", {
            page: pageNum,
            count,
            filter: 3,
            searchQuery: "",
            language: "",
            userId
        }, { signal })
            .then(result => {
                if (!result || !result.codes) {
                    setIsLoading(false)
                    if (signal.aborted) return
                    setError("Something went wrong");
                    return
                }
                setResults(prev => [...prev, ...result.codes])
                setHasNextPage(result.codes.length === count)
                setIsLoading(false)
            })

        return () => controller.abort()

    }, [pageNum])

    return { isLoading, error, results, hasNextPage }
}

export default useCodes;