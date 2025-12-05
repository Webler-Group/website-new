import { Button, Form, FormControl } from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { LinkContainer } from "react-router-bootstrap";
import { languagesInfo } from "../../../data/compilerLanguages";
import Code from "./Code";
import QuestionPlaceholder from "../../discuss/components/QuestionPlaceholder";
import { ChangeEvent, useEffect, useState } from "react";
import { useAuth } from "../../auth/context/authContext";
import { useApi } from "../../../context/apiCommunication";

interface ICodesState {
    page: number;
    searchQuery: string;
    filter: number;
    language: string | null;
    ready: boolean;
}

interface CodeListProps {
    codesState: ICodesState;
    setCodesState: (setter: (prev: ICodesState) => ICodesState) => void;
    onCodeClick?: (id: string) => void;
    isCodeSelected?: (id: string) => boolean;
    showNewCodeBtn: boolean;
}

const CodeList = ({ codesState, setCodesState, onCodeClick, isCodeSelected, showNewCodeBtn }: CodeListProps) => {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const [codes, setCodes] = useState<any[]>([]);
    const codesPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [codesCount, setCodesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState(1);
    const [language, setLanguage] = useState("all");
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (codesState.ready) {
            getCodes();
        }
        setFilter(codesState.filter);
        setSearchInput(codesState.searchQuery);
        setSearchQuery(codesState.searchQuery);
        setLanguage(codesState.language || "all");
    }, [codesState]);

    useEffect(() => {
        handlePageChange(1);
    }, [filter, language, searchQuery]);

    const handlePageChange = (page: number) => {
        if (currentPage === page) {
            return
        }
        setCodesState(prev => ({ ...prev, page }));
        setCurrentPage(page);
    }

    const handleSearch = () => {
        const value = searchInput.trim()
        setCodesState(prev => ({ ...prev, searchQuery: value }));
        setSearchQuery(value);
    }

    const getCodes = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Codes`, "POST", {
            page: codesState.page,
            count: codesPerPage,
            filter: codesState.filter,
            searchQuery: codesState.searchQuery,
            language: codesState.language,
            userId: userInfo ? userInfo.id : null
        });
        if (result && result.codes) {
            setCodes(result.codes);
            setCodesCount(result.count);
        }
        setLoading(false);
    }

    const handleFilterSelect = (e: ChangeEvent) => {
        const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value);
        setCodesState(prev => ({ ...prev, filter: value }))
        setFilter(value);
    }

    const handleLanguageSelect = (e: ChangeEvent) => {
        const value = (e.target as HTMLSelectElement).selectedOptions[0].value
        setCodesState(prev => ({ ...prev, language: value === "all" ? null : value }))
        setLanguage(value)
    }

    let placeholders = [];
    for (let i = 0; i < codesPerPage; ++i) {
        placeholders.push(<QuestionPlaceholder key={i} />);
    }

    return (
        <div>
            <div className="d-flex gap-2">
                <Form.Label htmlFor="search" className="visually-hidden">
                    Search codes
                </Form.Label>
                <FormControl
                    id="search"
                    type="search"
                    size='sm'
                    placeholder="Search..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleSearch();
                        }
                    }}
                />
                <Button size='sm' onClick={handleSearch}>Search</Button>
            </div>
            <div className="mt-2 d-sm-flex flex-row-reverse justify-content-between">
                {
                    showNewCodeBtn &&
                    <div className="mb-2 mb-sm-0 d-flex justify-content-end">
                        <LinkContainer to="/Compiler-Playground">
                            <Button size='sm'>New code</Button>
                        </LinkContainer>
                    </div>
                }
                <div className="d-flex gap-2 justify-content-between">
                    <Form.Group>
                        <Form.Label htmlFor="filter" className="visually-hidden">
                            Filter
                        </Form.Label>
                        <Form.Select id="filter" size='sm' style={{ width: "140px" }} value={filter} onChange={handleFilterSelect}>
                            <option value="1">Most Recent</option>
                            <option value="2">Most Popular</option>
                            {
                                userInfo &&
                                <>
                                    <option value="3">My Codes</option>
                                </>
                            }
                        </Form.Select>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label htmlFor="language" className="visually-hidden">
                            Language
                        </Form.Label>
                        <Form.Select id="language" size='sm' style={{ width: "140px" }} value={language} onChange={handleLanguageSelect}>
                            <option key="all" value="all">All</option>
                            {
                                Object.entries(languagesInfo).map(entry => {
                                    return (
                                        <option key={entry[0]} value={entry[0]}>{entry[1].displayName}</option>
                                    )
                                })
                            }
                        </Form.Select>
                    </Form.Group>
                </div>
            </div>
            <div className="my-3">
                {
                    loading ?
                        placeholders
                        :
                        codesCount == 0 ?
                            <div className="wb-empty-list">
                                <h3>Nothing to show</h3>
                            </div>
                            :
                            codes.map(code => {
                                return (
                                    <div key={code.id}>
                                        <Code
                                            code={code}
                                            searchQuery={searchQuery}
                                            showUserProfile={filter != 3}
                                            onClick={onCodeClick ? () => onCodeClick(code.id) : undefined}
                                            selected={isCodeSelected?.(code.id)} />
                                    </div>
                                )
                            })

                }
            </div>
            <div className='my-3'>
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

export type {
    ICodesState
}

export default CodeList;