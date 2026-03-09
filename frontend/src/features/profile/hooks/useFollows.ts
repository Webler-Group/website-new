import { useEffect, useState } from "react"
import { useApi } from "../../../context/apiCommunication"
import { FollowsData, UserMinimal } from "../types";

const useFollows = (options: { path?: string; userId: string | null; }, countPerPage: number) => {
    const { sendJsonRequest } = useApi();
    const [users, setUsers] = useState<UserMinimal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);
    const [state, setState] = useState({ page: 0 });

    useEffect(() => {
        const fetchUsers = async () => {
            if (state.page == 0 || !options.userId || !options.path) return;

            setIsLoading(true);
            setError("");
            const result = await sendJsonRequest<FollowsData>(options.path, "POST", {
                userId: options.userId,
                count: countPerPage,
                page: state.page
            });
            if (result.data) {
                const users = result.data.users;
                setUsers(prev => state.page == 1 ? users : [...prev, ...users]);
                setHasNextPage(users.length === countPerPage);
            } else {
                setError("Something went wrong");
            }
            setIsLoading(false);
        }

        fetchUsers();
    }, [state]);

    useEffect(() => {
        setUsers([]);
        setState({ page: 1 });
    }, [options]);

    return { isLoading, error, results: users, hasNextPage, setState };
}

export default useFollows;