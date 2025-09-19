import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApi } from "../../context/apiCommunication";
import { useAuth } from "../../features/auth/context/authContext";

interface UseListViewOptions {
    endPoint: string;
    method: string;
    itemsPerPage: number;
}

export default function useListView<T>({ endPoint, method, itemsPerPage }: UseListViewOptions ) {
    const { sendJsonRequest } = useApi();
    const [items, setItems] = useState<T[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();
    const [itemsCount, setItemsCount] = useState(0);

    useEffect(() => {
        fetchItems();
    }, [searchParams]);


    useEffect(() => {
        handlePageChange(1);
    }, [filter, searchQuery]);

    useEffect(() => {
        if (searchParams.has("page")) {
            setCurrentPage(Number(searchParams.get("page")))
        }
        if (searchParams.has("filter")) {
            setFilter(Number(searchParams.get("filter")))
        }
        if (searchParams.has("query")) {
            setSearchQuery(searchParams.get("query")!)
        }
    }, []);

    const handlePageChange = (page: number) => {
        if (currentPage === page) {
            return
        }
        searchParams.set("page", page.toString());
        setSearchParams(searchParams, { replace: true })
        setCurrentPage(page);
    }

    const handleSearch = (value: string) => {
        searchParams.set("query", value);
        setSearchParams(searchParams, { replace: true });
        setSearchQuery(value);
    }

    const handleFilterSelect = (v: string) => {
        const value = Number(v);
        searchParams.set("filter", value.toString());
        setSearchParams(searchParams, { replace: true });
        setFilter(value);
    }


    const fetchItems = async () => {
        setLoading(true);
        const page = searchParams.has("page") ? Number(searchParams.get("page")) : 1;
        const filter = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
        const searchQuery = searchParams.has("query") ? searchParams.get("query")! : "";
        const result = await sendJsonRequest(endPoint, method, {
            page,
            count: itemsPerPage,
            filter,
            searchQuery,
        });

        if (result && result.items) {
            setItems(result.items);
            setItemsCount(result.count);
        }

        setLoading(false);
    }

    return {
        items,
        loading,
        itemsCount,
        searchQuery,
        filter,
        currentPage,
        handlePageChange,
        handleSearch,
        handleFilterSelect
    }

}