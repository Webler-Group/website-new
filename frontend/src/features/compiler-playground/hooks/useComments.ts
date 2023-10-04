import { useEffect, useState } from "react"
import { ICodeComment } from "../components/CommentNode"
import ApiCommunication from "../../../helpers/apiCommunication"

const useComments = (codeId: string, parentId: string | null, count: number, index: number, filter: number) => {

    const [results, setResults] = useState<ICodeComment[]>([])

    const controller = new AbortController()

    const { signal } = controller

    const getComments = async (keepPrev: boolean) => {
        const result = await ApiCommunication.sendJsonRequest("/Discussion/GetCodeComments", "POST", {
            codeId,
            parentId,
            index,
            count,
            filter
        },
            signal)
        if (result && result.posts) {
            setResults(prev => keepPrev ? [...prev, result.posts] : result.posts)
        }
    }

    useEffect(() => {
        getComments(true)
    }, [index])

    useEffect(() => {
        getComments(false)
    }, [codeId, filter])

    return {
        results
    }
}

export default useComments