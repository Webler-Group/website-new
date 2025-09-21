import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"

const useNotifications = (count: number, prevId: string | null, isOpened: boolean) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(false)

    useEffect(() => {
        if (!isOpened) return;

        const fetchNotifications = async () => {
            setIsLoading(true)
            setError("");

            const result = await sendJsonRequest(`/Profile/GetNotifications`, "POST", { count, fromId: prevId ?? null })

            if (result && result.notifications) {
                setResults(prev => prevId ? [...prev, ...result.notifications] : result.notifications)
                setHasNextPage(result.notifications.length === count)
                setIsLoading(false)
            } else {
                setError(result?.error[0].message ?? "Something went wrong");
            }

            setIsLoading(false);
        }

        fetchNotifications();
    }, [prevId, isOpened])

    const onMarkAllAsRead = () => {
        setResults(notifications => notifications.map(item => ({ ...item, isClicked: true })))
    }

    return { isLoading, error, results, hasNextPage, onMarkAllAsRead }
}

export default useNotifications;