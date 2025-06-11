import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"

const useNotifications = (count: number, prevId: string | null, isOpened: boolean) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [hasNextPage, setHasNextPage] = useState(false)

    useEffect(() => {
        if (!isOpened) return

        setIsLoading(true)
        setError("")

        const controller = new AbortController()
        const { signal } = controller

        let body = {
            count
        } as any;

        if (prevId) {
            body.fromId = prevId;
        }

        sendJsonRequest(`/Profile/GetNotifications`, "POST", body, { signal })
            .then(result => {
                if (!result || !result.notifications) {
                    setIsLoading(false)
                    if (signal.aborted) return
                    setError("Something went wrong");
                    return
                }
                setResults(prev => prevId ? [...prev, ...result.notifications] : result.notifications)
                setHasNextPage(result.notifications.length === count)
                setIsLoading(false)
            })

        return () => controller.abort()

    }, [prevId, isOpened])

    const onMarkAllAsRead = () => {
        setResults(notifications => notifications.map(item => ({ ...item, isClicked: true })))
    }

    return { isLoading, error, results, hasNextPage, onMarkAllAsRead }
}

export default useNotifications;