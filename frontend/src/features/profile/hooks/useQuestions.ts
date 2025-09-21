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

        const fetchData = async () => {
            setIsLoading(true)
            setError("")

            const result = await sendJsonRequest(`/Discussion`, "POST", {
                page: pageNum,
                count,
                filter: 3,
                userId
            });

            if (result && result.questions) {
                setResults(prev => [...prev, ...result.questions])
                setHasNextPage(result.questions.length === count)
            } else {
                setError(result?.error[0].message ?? "Something went wrong");
            }
            setIsLoading(false)
        };

        fetchData();

    }, [pageNum])

    return { isLoading, error, results, hasNextPage }
}

export default useQuestions;