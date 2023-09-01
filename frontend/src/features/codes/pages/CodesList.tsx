import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { Button, Form, FormControl } from 'react-bootstrap'
import { LinkContainer } from 'react-router-bootstrap';
import ApiCommunication from '../../../helpers/apiCommunication';
import Code from '../components/Code';
import { useAuth } from '../../auth/context/authContext';
import { PaginationControl } from 'react-bootstrap-pagination-control';
import QuestionPlaceholder from '../../discuss/components/QuestionPlaceholder';
import { useSearchParams } from 'react-router-dom';

const CodesList = () => {

    const { userInfo } = useAuth();
    const [codes, setCodes] = useState<any[]>([]);
    const codesPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [codesCount, setCodesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState(1);
    const [language, setLanguage] = useState("all");
    const searchInputElement = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        getCodes();
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

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();

        if (searchInputElement.current) {
            const value = searchInputElement.current.value.trim()
            searchParams.set("query", value);
            setSearchParams(searchParams, { replace: true });
            setSearchQuery(value);
        }
    }

    const getCodes = async () => {
        setLoading(true);
        const page = searchParams.has("page") ? Number(searchParams.get("page")) : 1;
        const filter = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
        const searchQuery = searchParams.has("query") ? searchParams.get("query")! : "";
        const language = searchParams.has("language") ? searchParams.get("language")! : "all";
        const result = await ApiCommunication.sendJsonRequest(`/Codes?page=${page}&count=${codesPerPage}&filter=${filter}&query=${searchQuery}` + (language !== "all" ? `&language=${language}` : "") + (userInfo ? `&profileId=${userInfo.id}` : ""), "GET");
        if (result && result.codes) {
            setCodes(result.codes);
            setCodesCount(result.count);
        }
        setLoading(false);
    }

    const handleFilterSelect = (e: ChangeEvent) => {
        const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value)
        searchParams.set("filter", value.toString())
        setSearchParams(searchParams, { replace: true })
        setFilter(value)
    }

    const handleLanguageSelect = (e: ChangeEvent) => {
        const value = (e.target as HTMLSelectElement).selectedOptions[0].value
        if (value === "all") {
            searchParams.delete("language");
        }
        else {
            searchParams.set("language", value)
        }
        setSearchParams(searchParams, { replace: true })
        setLanguage(value)
    }

    let placeholders = [];
    for (let i = 0; i < codesPerPage; ++i) {
        placeholders.push(<QuestionPlaceholder key={i} />);
    }

    return (
        <div className="d-flex flex-column">
            <h2>Codes</h2>
            <Form className="d-flex mt-4" onSubmit={handleSearch}>
                <FormControl type="search" placeholder="Search..." ref={searchInputElement} />
                <Button className="ms-2" type="submit">Search</Button>
            </Form>
            <div className="mt-4 d-sm-flex flex-row-reverse justify-content-between">
                <div className="mb-4 mb-sm-0 d-flex justify-content-end">
                    <LinkContainer to="/Compiler-Playground">
                        <Button>New code</Button>
                    </LinkContainer>
                </div>
                <div className="d-flex">
                    <Form.Select value={filter} onChange={handleFilterSelect}>
                        <option value="1">Most Recent</option>
                        <option value="2">Most Popular</option>
                        {
                            userInfo &&
                            <>
                                <option value="3">My Codes</option>
                            </>
                        }
                    </Form.Select>
                    <Form.Select className="ms-2" value={language} onChange={handleLanguageSelect}>
                        <option value="all">All</option>
                        <option value="web">Web</option>
                    </Form.Select>
                </div>
            </div>
            <div className="my-3">
                {
                    loading ?
                        placeholders
                        :
                        codesCount == 0 ?
                            <div className="wb-discuss-empty-questions">
                                <h3>Nothing to show</h3>
                            </div>
                            :
                            codes.map(code => {
                                return (
                                    <Code code={code} searchQuery={searchQuery} key={code.id} />
                                )
                            })

                }
            </div>
            <div>
                <PaginationControl
                    page={currentPage}
                    between={3}
                    total={codesCount}
                    limit={codesPerPage}
                    changePage={handlePageChange}
                    ellipsis={1}
                />
            </div>
        </div>
    )
}

export default CodesList