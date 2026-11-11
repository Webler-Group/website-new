import { Badge, Button, Form, FormControl, InputGroup, Pagination, Table } from "../../../components/ui";
import { useNavigate, useSearchParams } from "react-router-dom";
import Loader from "../../../components/Loader";
import PageTitle from "../../../layouts/PageTitle";
import { useApi } from "../../../context/apiCommunication";
import { ChangeEvent, useEffect, useState } from "react";
import { useAuth } from "../../auth/context/authContext";
import { FaLock, FaSearch, FaPlus, FaCheck } from "react-icons/fa";
import { ChallengeListData, ChallengeMinimal } from "../types";


const ChallengeList = () => {
    PageTitle("Challenges");

    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const [challenges, setChallenges] = useState<ChallengeMinimal[]>([]);
    const challengesPerPage = 12;
    const [currentPage, setCurrentPage] = useState(1);
    const [challengeCount, setChallengeCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [difficulty, setDifficulty] = useState("all");
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();
    const [isPublic, setIsPublic] = useState(true);


    useEffect(() => {
        getChallenges();
    }, [searchParams, isPublic]);

    useEffect(() => {
        handlePageChange(1);
    }, [difficulty, searchQuery]);

    useEffect(() => {
        if (searchParams.has("page")) {
            setCurrentPage(Number(searchParams.get("page")))
        }
        if (searchParams.has("difficulty")) {
            setDifficulty(searchParams.get("difficulty")!);
        }
        if (searchParams.has("query")) {
            setSearchQuery(searchParams.get("query")!);
            setSearchInput(searchParams.get("query")!);
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

    const handleSearch = () => {
        searchParams.set("query", searchInput);
        setSearchParams(searchParams, { replace: true });
        setSearchQuery(searchInput);
    }

    const getChallenges = async () => {
        setLoading(true);
        const result = await sendJsonRequest<ChallengeListData>(`/Challenge`, "POST", {
            page: searchParams.has("page") ? Number(searchParams.get("page")) : 1,
            filter: 1,
            userId: userInfo?.id,
            count: challengesPerPage,
            difficulty: searchParams.has("difficulty") ? searchParams.get("difficulty") : null,
            searchQuery: searchParams.has("query") ? searchParams.get("query")! : "",
            isVisible: isPublic ? 1 : 0,
        });
        if (result.data) {
            setChallenges(result.data.challenges);
            setChallengeCount(result.data.count);
        }
        setLoading(false);
    }

    const handleDifficultySelect = (e: ChangeEvent) => {
        const value = (e.target as HTMLSelectElement).selectedOptions[0].value
        if (value == "all") {
            searchParams.delete("difficulty");
        } else {
            searchParams.set("difficulty", value);
        }
        setSearchParams(searchParams, { replace: true });
        setDifficulty(value);
    }

    return (
        <div className="py-2">
            <div className="wb-challenges-header d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
                <div className="d-flex flex-grow-1 gap-2 align-items-center">
                    <InputGroup size="sm" className="wb-challenges-search">
                        <FormControl
                            placeholder="Search challenges..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <Button variant="outline-primary" onClick={handleSearch}>
                            <FaSearch />
                        </Button>
                    </InputGroup>

                    <Form.Select 
                        size='sm' 
                        value={difficulty} 
                        onChange={handleDifficultySelect}
                        className="wb-form-filter-select wb-form-filter-select--narrow"
                    >
                        <option value="all">Level</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </Form.Select>
                </div>

                <div className="d-flex align-items-center gap-3">
                    {userInfo?.roles.some(x => ["Admin", "Creator"].includes(x)) && (
                        <>
                            <Form.Check
                                type="switch"
                                label="Public only"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="small text-muted"
                            />
                            <Button to="/Challenge/Create" size='sm' className="d-flex align-items-center gap-2">
                                    <FaPlus size={12} /> Create
                                </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-4">
                {loading ? (
                    <Loader />
                ) : challengeCount === 0 ? (
                    <div className="wb-app-empty-list py-5 text-center bg-body-tertiary rounded-3 border">
                        <FaSearch size={40} className="text-muted mb-3 opacity-25" />
                        <h3 className="text-muted">No challenges found</h3>
                        <p className="text-muted small">Try adjusting your filters or search terms</p>
                    </div>
                ) : (
                    <div className="wb-challenges-table-container">
                        <Table hover className="wb-challenges-table mb-0">
                            <thead>
                                <tr>
                                    <th className="wb-challenges-table-col-status text-center"><span className="d-none d-md-inline">Status</span></th>
                                    <th className="wb-challenges-table-col-title">Title</th>
                                    <th className="wb-challenges-table-col-acceptance text-center d-none d-md-table-cell">Acceptance</th>
                                    <th className="wb-challenges-table-col-difficulty text-center">Difficulty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {challenges.map((challenge) => (
                                    <tr key={challenge.id}>
                                        <td className="text-center align-middle">
                                            {challenge.isSolved && <FaCheck className="text-success" size={14} />}
                                        </td>
                                        <td className="align-middle wb-util-clickable" onClick={() => navigate(`/Challenge/${challenge.id}`)}>
                                            <div className="d-flex flex-column">
                                                <span className="wb-challenges-table-title">
                                                    {challenge.title}
                                                    {!isPublic && <FaLock size={10} className="text-muted ms-2" />}
                                                </span>
                                                <span className="d-md-none text-muted wb-util-text-xs">
                                                    Acceptance: {challenge.acceptance}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-center align-middle d-none d-md-table-cell">
                                            <span className="small">{challenge.acceptance}%</span>
                                        </td>
                                        <td className="text-center align-middle">
                                            <Badge
                                                className={`wb-challenges-difficulty-mini ${challenge.difficulty === "easy"
                                                    ? "bg-success"
                                                    : challenge.difficulty === "medium"
                                                        ? "bg-warning text-dark"
                                                        : "bg-danger"
                                                    }`}
                                            >
                                                {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </div>

            <div className='my-3'>
                <Pagination
                    page={currentPage}
                    between={3}
                    total={challengeCount}
                    limit={challengesPerPage}
                    changePage={handlePageChange}
                    ellipsis={1}
                />
            </div>

        </div>
    );
};

export default ChallengeList;
