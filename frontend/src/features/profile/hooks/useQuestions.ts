import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"
import { QuestionListData, QuestionMinimal } from "../../discuss/types";
import { UserMinimal } from "../types";

const useQuestions = (userId: string, count: number, pageNum: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<QuestionMinimal<UserMinimal>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);

    useEffect(() => {

        const fetchData = async () => {
            setIsLoading(true);
            setError("");

            const result = await sendJsonRequest<QuestionListData>(`/Discussion`, "POST", {
                page: pageNum,
                count,
                filter: 3,
                userId
            });

            if (result.data) {
                const questions = result.data.questions;
                setResults(prev => [...prev, ...questions])
                setHasNextPage(questions.length === count)
            } else {
                setError(result.error?.[0].message ?? "Something went wrong");
            }
            setIsLoading(false);
        };

        fetchData();

    }, [pageNum]);

    return { isLoading, error, results, hasNextPage };
}

export default useQuestions;