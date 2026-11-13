import { Button, Col, Form, FormControl, InputGroup, Modal, Pagination, ProgressBar, Row, Table } from "../../../components/ui";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Loader from "../../../components/Loader";
import PageTitle from "../../../layouts/PageTitle";
import { useApi } from "../../../context/apiCommunication";
import { useSnackbar } from "../../../context/SnackbarProvider";
import { ChangeEvent, useEffect, useState } from "react";
import { useAuth } from "../../auth/context/authContext";
import { FaLock, FaSearch, FaPlus, FaCheckCircle, FaLayerGroup, FaTrash } from "react-icons/fa";
import { ChallengeCollectionListData, ChallengeCollectionMinimal, ChallengeListData, ChallengeMinimal, ChallengeTagCount, ChallengeTagsData } from "../types";
import ChallengeTags from "../components/ChallengeTags";
import ChallengeTagFilter from "../components/ChallengeTagFilter";


const ChallengeList = () => {
    PageTitle("Challenges");

    const { sendJsonRequest } = useApi();
    const { showMessage } = useSnackbar();
    const { userInfo } = useAuth();
    const navigate = useNavigate();
    const isCreator = !!userInfo?.roles.some(x => ["Admin", "Creator"].includes(x));
    const [challenges, setChallenges] = useState<ChallengeMinimal[]>([]);
    const challengesPerPage = 20;
    const [currentPage, setCurrentPage] = useState(1);
    const [challengeCount, setChallengeCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [difficulty, setDifficulty] = useState("all");
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();
    const [isPublic, setIsPublic] = useState(true);
    const [collections, setCollections] = useState<ChallengeCollectionMinimal[]>([]);
    const [tags, setTags] = useState<ChallengeTagCount[]>([]);
    const [toDelete, setToDelete] = useState<ChallengeMinimal | null>(null);
    const activeTag = searchParams.get("tag");

    useEffect(() => {
        getChallenges();
    }, [searchParams, isPublic]);

    useEffect(() => {
        getTags();
    }, [isPublic]);

    useEffect(() => {
        getCollections();
    }, []);

    const getCollections = async () => {
        const result = await sendJsonRequest<ChallengeCollectionListData>("/Challenge/Collections", "POST");
        if (result.data) {
            setCollections(result.data.collections);
        }
    }

    const getTags = async () => {
        const result = await sendJsonRequest<ChallengeTagsData>("/Challenge/Tags", "POST", { isVisible: isPublic ? 1 : 0 });
        setTags(result.data?.tags ?? []);
    }

    const setTagFilter = (tag: string | null) => {
        if (tag) {
            searchParams.set("tag", tag);
        } else {
            searchParams.delete("tag");
        }
        searchParams.set("page", "1");
        setSearchParams(searchParams, { replace: true });
        setCurrentPage(1);
    }

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
            tag: searchParams.get("tag"),
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

    const handleDelete = async () => {
        if (!toDelete) return;
        const result = await sendJsonRequest("/Challenge/Delete", "POST", { challengeId: toDelete.id });
        showMessage(result.success ? `Deleted "${toDelete.title}"` : result.error?.[0]?.message ?? "Could not delete the challenge");
        setToDelete(null);
        if (result.success) {
            getChallenges();
            getTags();
            getCollections();
        }
    }

    return (
        <div className="py-3">
            <div className="wb-challenges-toolbar">
                <InputGroup className="wb-challenges-search">
                    <FormControl
                        placeholder="Search challenges..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button variant="primary" onClick={handleSearch} aria-label="Search">
                        <FaSearch />
                    </Button>
                </InputGroup>

                <Form.Select value={difficulty} onChange={handleDifficultySelect} className="wb-challenges-difficulty-select">
                    <option value="all">All levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </Form.Select>

                {isCreator && (
                    <div className="d-flex flex-wrap align-items-center gap-2 ms-lg-auto">
                        <Form.Check
                            type="switch"
                            id="public-only"
                            label="Public only"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="small text-muted text-nowrap me-1"
                        />
                        <Button to="/Challenge/Create" size="sm" className="d-flex align-items-center gap-2 text-nowrap">
                            <FaPlus size={12} /> Create
                        </Button>
                        <Button to="/Challenge/Collection/Create" size="sm" variant="outline-primary" className="d-flex align-items-center gap-2 text-nowrap">
                            <FaLayerGroup size={12} /> New collection
                        </Button>
                    </div>
                )}
            </div>

            <ChallengeTagFilter tags={tags} active={activeTag} onSelect={setTagFilter} />

            <Row className="g-4">
                <Col lg={8} xl={9} className="order-2 order-lg-1">
                    <div className="d-flex align-items-baseline justify-content-between mb-2">
                        <h2 className="fs-6 fw-bold text-uppercase text-muted mb-0">Problems</h2>
                        {!loading && <span className="small text-muted">{challengeCount} {challengeCount === 1 ? "problem" : "problems"}</span>}
                    </div>
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
                                        <th className="wb-challenges-table-col-status"></th>
                                        <th className="wb-challenges-table-col-title">Title</th>
                                        <th className="wb-challenges-table-col-acceptance text-center d-none d-md-table-cell">Acceptance</th>
                                        <th className="wb-challenges-table-col-difficulty text-center">Difficulty</th>
                                        {isCreator && <th className="wb-challenges-table-col-actions"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {challenges.map((challenge) => (
                                        <tr key={challenge.id} className="wb-challenges-row" onClick={() => navigate(`/Challenge/${challenge.id}`)}>
                                            <td className="text-center align-middle">
                                                {challenge.isSolved && <FaCheckCircle className="text-success" size={15} title="Solved" />}
                                            </td>
                                            <td className="align-middle">
                                                <div className="d-flex flex-column">
                                                    <span className="wb-challenges-table-title">
                                                        {challenge.title}
                                                        {!isPublic && <FaLock size={10} className="text-muted ms-2" />}
                                                    </span>
                                                    <ChallengeTags tags={challenge.tags} className="mt-1" onSelect={setTagFilter} max={3} />
                                                    <span className="d-md-none text-muted wb-util-text-xs">
                                                        Acceptance: {challenge.acceptance}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="text-center align-middle d-none d-md-table-cell">
                                                <span className="small">{challenge.acceptance}%</span>
                                            </td>
                                            <td className="text-center align-middle">
                                                <span className={`wb-challenges-difficulty wb-challenges-difficulty--${challenge.difficulty}`}>
                                                    {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                                                </span>
                                            </td>
                                            {isCreator && (
                                                <td className="text-center align-middle">
                                                    <Button variant="link" size="sm" className="p-1 text-danger wb-challenges-row-action" title="Delete challenge"
                                                        onClick={(e) => { e.stopPropagation(); setToDelete(challenge); }}>
                                                        <FaTrash size={12} />
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    <div className="my-3">
                        <Pagination
                            page={currentPage}
                            between={3}
                            total={challengeCount}
                            limit={challengesPerPage}
                            changePage={handlePageChange}
                            ellipsis={1}
                        />
                    </div>
                </Col>

                {collections.length > 0 && (
                    <Col lg={4} xl={3} className="order-1 order-lg-2">
                        <h2 className="fs-6 fw-bold text-uppercase text-muted mb-2">Collections</h2>
                        <div className="wb-challenges-collection-sidebar">
                            {collections.map(collection => {
                                const percent = collection.challengeCount > 0
                                    ? Math.round((collection.solvedCount / collection.challengeCount) * 100)
                                    : 0;
                                return (
                                    <Link key={collection.id} to={`/Challenge/Collection/${collection.id}`} className="wb-challenges-collection-card">
                                        <div className="d-flex align-items-center gap-2">
                                            <FaLayerGroup className="text-primary flex-shrink-0" />
                                            <span className="wb-challenges-collection-card-title">{collection.title}</span>
                                            {!collection.isPublic && <FaLock size={10} className="text-muted" />}
                                        </div>
                                        <span className="small text-muted">
                                            {collection.challengeCount} problems · {collection.sectionCount} {collection.sectionCount === 1 ? "section" : "sections"}
                                        </span>
                                        <div className="d-flex align-items-center gap-2">
                                            <ProgressBar now={percent} variant="success" className="flex-grow-1 wb-challenges-collection-progress" />
                                            <span className="small text-muted text-nowrap">{collection.solvedCount} / {collection.challengeCount}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </Col>
                )}
            </Row>

            <Modal show={toDelete !== null} onHide={() => setToDelete(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-5">Delete challenge?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    "{toDelete?.title}" will be deleted for good, together with all its submissions and saved code. It is also
                    removed from any collection that lists it.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="subtle" className="border" onClick={() => setToDelete(null)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ChallengeList;
