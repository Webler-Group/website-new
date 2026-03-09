import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { ChallengeListData, ChallengeMinimal } from "../../challenges/types";

const useSolvedChallenges = (userId: string, count: number, pageNum: number) => {
    const { sendJsonRequest } = useApi();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<ChallengeMinimal[]>([]);
    const [hasNextPage, setHasNextPage] = useState(false);

    useEffect(() => {
        const fetchChallenges = async () => {
            setIsLoading(true);
            setError(null);

            const result = await sendJsonRequest<ChallengeListData>("/Challenge", "POST", {
                userId,
                count,
                page: pageNum,
                filter: 2,
                isVisible: 1
            });
            if (result.data) {
                const challenges = result.data.challenges;
                setResults(prev => (pageNum === 1 ? challenges : [...prev, ...challenges]));
                setHasNextPage(challenges.length === count);
            } else {
                setError(result.error?.[0].message ?? "Something went wrong");
            }
        }
        fetchChallenges();
    }, [userId, count, pageNum]);

    return { isLoading, error, results, hasNextPage };
};

export default useSolvedChallenges;
