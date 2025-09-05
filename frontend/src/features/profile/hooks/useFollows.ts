import { useCallback, useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"

const useFollows = (options: { path?: string; userId: string | null; }, countPerPage: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(false)
    const [state, setState] = useState({ page: 0 });

    const fetchUsers = useCallback(async () => {
        if (state.page == 0 || !options.userId || !options.path) return;

        setIsLoading(true)
        setError("")
        const result = await sendJsonRequest(options.path, "POST", {
            userId: options.userId,
            count: countPerPage,
            page: state.page
        })
        if (result && result.data) {
            setResults(prev => state.page == 1 ? result.data : [...prev, ...result.data])
            setHasNextPage(result.data.length === countPerPage)
        } else {
            setError("Something went wrong")
        }
        setIsLoading(false)
    }, [state]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        setResults([]);
        setState({ page: 1 });
    }, [options]);

    return { isLoading, error, results, hasNextPage, setState }
}

export default useFollows;