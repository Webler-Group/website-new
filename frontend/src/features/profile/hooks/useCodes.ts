import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"
import { CodeMinimal, CodesListData } from "../../codes/types";
import { UserMinimal } from "../types";

const useCodes = (userId: string, count: number, pageNum: number) => {
    const { sendJsonRequest } = useApi();
    const [results, setResults] = useState<CodeMinimal<UserMinimal>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);

    useEffect(() => {

        const fetchData = async () => {
            setIsLoading(true);
            setError("");

            const result = await sendJsonRequest<CodesListData>(`/Codes`, "POST", {
                page: pageNum,
                count,
                filter: 3,
                userId
            });

            if (result.data) {
                const codes = result.data.codes;
                setResults(prev => [...prev, ...codes]);
                setHasNextPage(codes.length === count);
            } else {
                setError(result.error?.[0].message ?? "Something went wrong");
            }
            setIsLoading(false);
        };

        fetchData();
    }, [pageNum]);

    return { isLoading, error, results, hasNextPage };
}

export default useCodes;