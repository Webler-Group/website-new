import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Container, Modal, ProgressBar, Table } from "react-bootstrap";
import { FaCheck, FaChevronRight, FaLayerGroup, FaLock, FaPen, FaSearch, FaTrash } from "react-icons/fa";
import { useApi } from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import PageTitle from "../../../layouts/PageTitle";
import Loader from "../../../components/Loader";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import ChallengeTags from "../components/ChallengeTags";
import { ChallengeCollectionDetails, GetChallengeCollectionData } from "../types";
import "../components/Challenge.css";

const difficultyClass = (difficulty: string) =>
    difficulty === "easy" ? "bg-success" : difficulty === "medium" ? "bg-warning text-dark" : "bg-danger";

const ChallengeCollectionPage = () => {
    const { collectionId } = useParams<{ collectionId: string }>();
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const { userInfo } = useAuth();
    const [collection, setCollection] = useState<ChallengeCollectionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDelete, setShowDelete] = useState(false);

    PageTitle(collection?.title ?? "Collection");

    useEffect(() => {
        getCollection();
    }, [collectionId]);

    const getCollection = async () => {
        setLoading(true);
        const result = await sendJsonRequest<GetChallengeCollectionData>("/Challenge/GetCollection", "POST", { collectionId });
        setCollection(result.data?.collection ?? null);
        setLoading(false);
    };

    const handleDelete = async () => {
        const result = await sendJsonRequest("/Challenge/DeleteCollection", "POST", { collectionId });
        setShowDelete(false);
        if (result.success) {
            navigate("/Challenge");
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center py-5"><Loader /></div>;
    }

    if (!collection) {
        return (
            <div className="d-flex py-5 flex-column align-items-center text-center">
                <h4><FaSearch /></h4>
                <h5>Collection not found</h5>
                <Link to="/Challenge">Go back</Link>
            </div>
        );
    }

    const all = [...new Map(collection.sections.flatMap(s => s.challenges).map(c => [c.id, c])).values()];
    const solved = all.filter(c => c.isSolved).length;
    const percent = all.length > 0 ? Math.round((solved / all.length) * 100) : 0;

    return (
        <Container className="py-4">
            <Modal show={showDelete} onHide={() => setShowDelete(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-5">Delete collection?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    "{collection.title}" will be deleted. The challenges in it are not deleted and stay available in the
                    challenge list.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" className="border" onClick={() => setShowDelete(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete</Button>
                </Modal.Footer>
            </Modal>
            <div className="wb-challenge-breadcrumb d-flex align-items-center gap-2">
                <Link to="/Challenge">Challenges</Link>
                <FaChevronRight size={10} className="text-muted opacity-50" />
                <span className="text-dark fw-medium">{collection.title}</span>
            </div>

            <div className="wb-challenge-hero">
                <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                    <div className="d-flex align-items-center gap-2 text-primary small fw-semibold text-uppercase">
                        <FaLayerGroup /> Collection
                        {!collection.isPublic && <FaLock size={10} className="text-muted" />}
                    </div>
                    {userInfo?.roles.some(x => ["Admin", "Creator"].includes(x)) && (
                        <div className="d-flex gap-2">
                            <Button
                                variant="light"
                                size="sm"
                                className="border d-flex align-items-center gap-2 px-2 fw-semibold"
                                onClick={() => navigate(`/Challenge/Collection/Edit/${collection.id}`)}
                            >
                                <FaPen size={10} /> Edit Collection
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                className="d-flex align-items-center gap-2 px-2 fw-semibold"
                                onClick={() => setShowDelete(true)}
                            >
                                <FaTrash size={10} /> Delete
                            </Button>
                        </div>
                    )}
                </div>
                <h2 className="fs-3 fw-bold text-dark">{collection.title}</h2>
                <div className="wb-collection-description text-muted">
                    <MarkdownRenderer content={collection.description} />
                </div>
                <div className="d-flex align-items-center gap-3 mt-3">
                    <ProgressBar now={percent} variant="success" className="flex-grow-1 wb-collection-progress" />
                    <span className="small fw-semibold text-nowrap">{solved} / {all.length} solved</span>
                </div>
            </div>

            {collection.sections.map((section, index) => {
                const sectionSolved = section.challenges.filter(c => c.isSolved).length;
                return (
                    <section key={section.title} className="wb-collection-section">
                        <div className="d-flex align-items-baseline justify-content-between gap-3 mb-1">
                            <h3 className="fs-5 fw-bold mb-0">
                                <span className="text-muted me-2">{index + 1}.</span>{section.title}
                            </h3>
                            <span className="small text-muted text-nowrap">{sectionSolved} / {section.challenges.length}</span>
                        </div>
                        {section.description && <p className="small text-muted mb-3">{section.description}</p>}

                        <div className="wb-challenge-table-container">
                            <Table hover className="wb-challenge-table mb-0">
                                <tbody>
                                    {section.challenges.map(challenge => (
                                        <tr key={challenge.id} className="cursor-pointer" onClick={() => navigate(`/Challenge/${challenge.id}?collection=${collection.id}`)}>
                                            <td className="wb-col-status text-center align-middle">
                                                {challenge.isSolved && <FaCheck className="text-success" size={14} />}
                                            </td>
                                            <td className="align-middle">
                                                <span className="wb-table-title">
                                                    {challenge.title}
                                                    {!challenge.isPublic && <FaLock size={10} className="text-muted ms-2" />}
                                                </span>
                                                <ChallengeTags tags={challenge.tags} className="mt-1" />
                                            </td>
                                            <td className="wb-col-diff text-center align-middle">
                                                <Badge className={`wb-challenge-difficulty-mini ${difficultyClass(challenge.difficulty)}`}>
                                                    {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </section>
                );
            })}
        </Container>
    );
};

export default ChallengeCollectionPage;
