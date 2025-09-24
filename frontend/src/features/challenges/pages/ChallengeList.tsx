import { Container, Row, Col, Card, Button, Form } from "react-bootstrap";
import { FaPlus } from "react-icons/fa6";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import { TagSearch } from "../../../components/InputTags";
import { PaginationControl } from "react-bootstrap-pagination-control";
import IChallenge from "../IChallenge";
import Loader from "../../../components/Loader";
import PageTitle from "../../../layouts/PageTitle";
import { useApi } from "../../../context/apiCommunication";
import { ChangeEvent, useEffect, useState } from "react";


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
    const [filter, setFilter] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();
    // const  { showMessage } = useSnackbar();

    useEffect(() => {
        getChallenges();
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

    const getChallenges = async () => {
        setLoading(true);
        const page = searchParams.has("page") ? Number(searchParams.get("page")) : 1;
        const filter = searchParams.has("filter") ? Number(searchParams.get("filter")) : 1;
        const searchQuery = searchParams.has("query") ? searchParams.get("query")! : "";
        const result = await sendJsonRequest(`/Challenge`, "POST", {
            page,
            count: challengesPerPage,
            filter,
            searchQuery
        });
        if (result && result.challenges) {
            setChallenges(result.challenges);
            setChallengeCount(result.count);
        }
        setLoading(false);
    }

    const handleFilterSelect = (e: ChangeEvent) => {
        const value = Number((e.target as HTMLSelectElement).selectedOptions[0].value)
        searchParams.set("filter", value.toString())
        setSearchParams(searchParams, { replace: true })
        setFilter(value)
    }

    const goToCreate = () => {
        navigate("./Create");
    }

    return (
        <Container className="py-4 position-relative w-100">
            <TagSearch
                placeholder="Search by title..."
                maxWidthPx={360}
                query={searchQuery}
                handleSearch={handleSearch} 
            />

            <div className="mt-2 d-flex justify-content-between">
                <Form.Select style={{ width: "140px" }} size='sm' value={filter} onChange={handleFilterSelect}>
                    <option value="1">All</option>
                    <option value="2">Easy</option>
                    <option value="3">Medium</option>
                    <option value="4">Hard</option>
                </Form.Select>

                <Form.Select disabled style={{ width: "140px" }} size='sm' value={filter} onChange={handleFilterSelect}>
                    <option value="1">Unsolved</option>
                    <option value="2">Solved</option>
                </Form.Select>
            </div>

            <div className="mt-2">
                {
                    loading ?
                        <Loader />
                        :
                        challengeCount == 0 ?
                            <div className="wb-discuss-empty-questions">
                                <h3>Nothing to show</h3>
                            </div>
                            :
                            <Row className="mt-3">
                                {challenges.map((c: IChallenge, idx) => (
                                <Col md={6} lg={4} key={idx} className="mb-3">
                                    <Card className="shadow-sm h-100">
                                    <Card.Body onClick={() => { navigate("./" + c.id) }} style={{cursor:"pointer"}}>
                                        <Card.Title>{c.title}</Card.Title>
                                        <div className="d-flex flex-wrap gap-2">
                                            <span className="text-info p-1 rounded btn-text">{c.difficulty}</span>
                                            <span className="text-success p-1 rounded">+{c.xp} Reward</span>
                                        </div>
                                    </Card.Body>
                                    </Card>
                                </Col>
                                ))}
                            </Row>

                }
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

            {
                userInfo && userInfo.roles.some(role => ["Admin", "Creator"].includes(role)) &&
                <Button
                    variant="success"
                    className="position-fixed bottom-0 end-0 m-4 rounded-pill d-flex align-items-center"
                    style={{ zIndex: 1050 }}
                    onClick = {() => { goToCreate() }}
                >
                    <span className="d-none d-md-inline">+ Create Challenge</span>
                    <FaPlus className="d-inline d-md-none" size={24} />
                </Button>
            }
        
        </Container>
    );
};

export default ChallengeList;
