import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { IChallenge } from "../../challenges/types";

const useSolvedChallenges = (userId: string, count: number, pageNum: number) => {
    const { sendJsonRequest } = useApi();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<IChallenge[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        sendJsonRequest("/Challenge", "POST", {
            userId,
            count,
            page: pageNum,
            filter: 2,
            isVisible: 1
        })
            .then((data) => {
                const items: IChallenge[] = data?.challenges ?? [];
                setResults((prev) => (pageNum === 1 ? items : [...prev, ...items]));
                setHasNextPage(!!data?.hasNextPage);
            })
            .catch((e) => setError(e?.message ?? "Something went wrong"))
            .finally(() => setIsLoading(false));
    }, [userId, count, pageNum]);

    return { isLoading, error, results, hasNextPage };
};

export default useSolvedChallenges;
