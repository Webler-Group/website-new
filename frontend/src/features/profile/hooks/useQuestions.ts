import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"
import { IQuestion } from "../../discuss/components/Question";

const useQuestions = (userId: string, count: number, pageNum: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<IQuestion[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(false)

    useEffect(() => {
        setIsLoading(true)
        setError("")

        const controller = new AbortController()
        const { signal } = controller

        sendJsonRequest(`/Discussion`, "POST", {
            page: pageNum,
            count,
            filter: 3,
            searchQuery: "",
            userId
        }, { signal })
            .then(result => {
                if (!result || !result.questions) {
                    setIsLoading(false)
                    if (signal.aborted) return
                    setError("Something went wrong");
                    return
                }
                setResults(prev => [...prev, ...result.questions])
                setHasNextPage(result.questions.length === count)
                setIsLoading(false)
            })

        return () => controller.abort()

    }, [pageNum])

    return { isLoading, error, results, hasNextPage }
}

export default useQuestions;