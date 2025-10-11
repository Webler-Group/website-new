import { Button, Form, FormControl, Row, Col, Badge } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { IChallenge } from "../types";
import Loader from "../../../components/Loader";
import PageTitle from "../../../layouts/PageTitle";
import { useApi } from "../../../context/apiCommunication";
import { ChangeEvent, useEffect, useState } from "react";
import { LinkContainer } from "react-router-bootstrap";
import { useAuth } from "../../auth/context/authContext";
import LanguageIcons from "../components/LanguageIcons";

const ChallengeList = () => {
    PageTitle("Code Challenge");

    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const [challenges, setChallenges] = useState<any[]>([]);
    const challengesPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [challengeCount, setChallengeCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [difficulty, setDifficulty] = useState("all");
    // const [status, setStatus] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();
    // const  { showMessage } = useSnackbar();

    useEffect(() => {
        getChallenges();
    }, [searchParams]);

    useEffect(() => {
        handlePageChange(1);
    }, [difficulty, status, searchQuery]);

    useEffect(() => {
        if (searchParams.has("page")) {
            setCurrentPage(Number(searchParams.get("page")))
        }
        if (searchParams.has("difficulty")) {
            setDifficulty(searchParams.get("difficulty")!);
        }
        // if (searchParams.has("status")) {
        //     setStatus(searchParams.get("status")!);
        // }
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
        const result = await sendJsonRequest(`/Challenge`, "POST", {
            page: searchParams.has("page") ? Number(searchParams.get("page")) : 1,
            count: challengesPerPage,
            difficulty: searchParams.has("difficulty") ? searchParams.get("difficulty") : null,
            // status: searchParams.has("status") ? searchParams.get("status") : null,
            searchQuery: searchParams.has("query") ? searchParams.get("query")! : ""
        });
        if (result && result.challenges) {
            setChallenges(result.challenges);
            setChallengeCount(result.count);
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

    // const handleStatusSelect = (e: ChangeEvent) => {
    //     const value = (e.target as HTMLSelectElement).selectedOptions[0].value
    //     if (value == "all") {
    //         searchParams.delete("status");
    //     } else {
    //         searchParams.set("status", value);
    //     }
    //     setSearchParams(searchParams, { replace: true });
    //     setStatus(value);
    // }

    return (
        <div>
            <div className="d-flex gap-2">
                <Form.Label htmlFor="search" className="visually-hidden">
                    Search challenges
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
                    userInfo?.roles.some(x => ["Admin", "Creator"].includes(x)) &&
                    <div className="mb-2 d-flex justify-content-end">
                        <LinkContainer to="/Challenge/Create">
                            <Button size='sm'>New challenge</Button>
                        </LinkContainer>
                    </div>
                }
                <div className="d-flex gap-2 justify-content-between">
                    <Form.Group>
                        <Form.Label htmlFor="difficulty" className="visually-hidden">
                            Difficulty
                        </Form.Label>
                        <Form.Select id="difficulty" style={{ width: "120px" }} size='sm' value={difficulty} onChange={handleDifficultySelect}>
                            <option value="all">All</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </Form.Select>
                    </Form.Group>

                    {/* <Form.Group>
                        <Form.Label htmlFor="status" className="visually-hidden">
                            Status
                        </Form.Label>
                        <Form.Select id="status" style={{ width: "120px" }} size='sm' value={status} onChange={handleStatusSelect}>
                            <option value="all">All</option>
                            <option value="unsolved">Unsolved</option>
                            <option value="solved">Solved</option>
                        </Form.Select>
                    </Form.Group> */}
                </div>
            </div>

            <div className="mt-2">
                {loading ? (
                    <Loader />
                ) : challengeCount === 0 ? (
                    <div className="wb-empty-list">
                        <h3>Nothing to show</h3>
                    </div>
                ) : (
                    <Row className="g-2">
                        {challenges.map((challenge: IChallenge, idx) => (
                            <Col key={idx} xs={12} sm={6} lg={4}>
                                <div className="shadow-sm border rounded p-2"
                                    onClick={() => navigate(`/Challenge/${challenge.id}`)}
                                    style={{ cursor: "pointer" }}>
                                    <div className="fw-semibold">{challenge.title}</div>
                                    <div>
                                        <Badge
                                            className={`${challenge.difficulty === "easy"
                                                ? "bg-success"
                                                : challenge.difficulty === "medium"
                                                    ? "bg-warning text-dark"
                                                    : "bg-danger"
                                                }`}
                                        >
                                            {challenge.difficulty}
                                        </Badge>
                                    </div>
                                    <div className="mt-2">
                                        <LanguageIcons  challenge={challenge} />
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                )}
            </div>

            <div className='my-3'>
                <PaginationControl
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
