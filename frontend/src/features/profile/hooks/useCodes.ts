import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"
import { ICode } from "../../codes/components/Code";

const useCodes = (userId: string, count: number, pageNum: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<ICode[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(false)

    useEffect(() => {

        const fetchData = async () => {
            setIsLoading(true)
            setError("")

            const result = await sendJsonRequest(`/Codes`, "POST", {
                page: pageNum,
                count,
                filter: 3,
                userId
            });

            if (result && result.codes) {
                setResults(prev => [...prev, ...result.codes])
                setHasNextPage(result.codes.length === count)
            } else {
                setError(result?.error[0].message ?? "Something went wrong");
            }
            setIsLoading(false)
        };

        fetchData();
    }, [pageNum])

    return { isLoading, error, results, hasNextPage }
}

export default useCodes;