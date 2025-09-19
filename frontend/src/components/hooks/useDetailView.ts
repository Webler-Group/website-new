import { useEffect, useState } from "react";
import { useApi } from "../../context/apiCommunication";

interface UseDetailViewOptions {
    endPoint: string;
    method: string;
    body: any;
}

export default function useDetailView<T>({ endPoint, method, body }: UseDetailViewOptions ) {
    const { sendJsonRequest } = useApi();
    const [item, setItem] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        const result = await sendJsonRequest(endPoint, method, body);

        if (result && result.items) {
            setItem(result.item);
        }

        setLoading(false);
    }

    return {
        item,
        loading
    }

}