import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom';
import CodeList, { ICodesState } from '../components/CodeList';

const CodesListPage = () => {
    const [codesState, setCodesState] = useState<ICodesState>({
        page: 1,
        filter: 1,
        searchQuery: "",
        language: null,
        ready: false
    });
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        setCodesState({
            page: searchParams.has("page") ? Number(searchParams.get("page")) : 1,
            filter: searchParams.has("filter") ? Number(searchParams.get("filter")) : 1,
            searchQuery: searchParams.get("query") ?? "",
            language: searchParams.get("language"),
            ready: true
        });
    }, []);

    useEffect(() => {
        searchParams.set("page", codesState.page.toString());
        searchParams.set("filter", codesState.filter.toString());
        searchParams.set("query", codesState.searchQuery);
        if (codesState.language == null) {
            searchParams.delete("langauge");
        } else {
            searchParams.set("language", codesState.language);
        }

        setSearchParams(searchParams, { replace: true });
    }, [codesState])

    return (
        <div>
            <h2>Codes</h2>
            <CodeList codesState={codesState} setCodesState={setCodesState} showNewCodeBtn={true} />
        </div>
    )
}

export default CodesListPage;