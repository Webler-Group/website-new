import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Card, Container, Form, Modal } from "react-bootstrap";
import { FaArrowDown, FaArrowUp, FaChevronRight, FaLock, FaPlus, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import { useApi } from "../../../context/apiCommunication";
import PageTitle from "../../../layouts/PageTitle";
import Loader from "../../../components/Loader";
import MdEditorField from "../../../components/MdEditorField";
import ChallengeSearchBox from "../components/ChallengeSearchBox";
import { GetChallengeCollectionData, SaveChallengeCollectionData } from "../types";
import ChallengeDifficultyEnum from "../../../data/ChallengeDifficultyEnum";
import "../components/Challenge.css";

interface EditableChallenge {
    id: string;
    title: string;
    difficulty: ChallengeDifficultyEnum;
    isPublic: boolean;
}

interface EditableSection {
    key: number;
    title: string;
    description: string;
    challenges: EditableChallenge[];
}

let nextKey = 0;
const newSection = (): EditableSection => ({ key: nextKey++, title: "", description: "", challenges: [] });

const move = <T,>(list: T[], index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= list.length) return list;
    const copy = [...list];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy;
};

const ChallengeCollectionEditPage = () => {
    const { collectionId } = useParams<{ collectionId: string }>();
    const isNew = !collectionId;
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(!isNew);
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [sections, setSections] = useState<EditableSection[]>(isNew ? [newSection()] : []);
    const [addingTo, setAddingTo] = useState<number | null>(null);
    const [showDelete, setShowDelete] = useState(false);

    PageTitle(isNew ? "New Collection" : "Edit Collection");

    useEffect(() => {
        if (!isNew) {
            getCollection();
        }
    }, [collectionId]);

    const getCollection = async () => {
        setLoading(true);
        const result = await sendJsonRequest<GetChallengeCollectionData>("/Challenge/GetCollection", "POST", { collectionId });
        const collection = result.data?.collection;
        if (collection) {
            setTitle(collection.title);
            setDescription(collection.description);
            setIsPublic(collection.isPublic);
            setSections(collection.sections.map(s => ({
                key: nextKey++,
                title: s.title,
                description: s.description,
                challenges: s.challenges.map(c => ({ id: c.id, title: c.title, difficulty: c.difficulty, isPublic: c.isPublic }))
            })));
        } else {
            setNotFound(true);
        }
        setLoading(false);
    };

    const updateSection = (key: number, changes: Partial<EditableSection>) => {
        setSections(list => list.map(s => s.key === key ? { ...s, ...changes } : s));
    };

    const handleSave = async () => {
        setSaving(true);
        setErrors([]);
        const payload = {
            title,
            description,
            isPublic,
            sections: sections.map(s => ({ title: s.title, description: s.description, challenges: s.challenges.map(c => c.id) }))
        };
        const result = isNew
            ? await sendJsonRequest<SaveChallengeCollectionData>("/Challenge/CreateCollection", "POST", payload)
            : await sendJsonRequest<SaveChallengeCollectionData>("/Challenge/UpdateCollection", "POST", { collectionId, ...payload });
        setSaving(false);
        if (result.success && result.data) {
            navigate(`/Challenge/Collection/${result.data.collection.id}`);
        } else {
            setErrors(result.error?.map(e => e.message) ?? ["Could not save the collection"]);
        }
    };

    const handleDelete = async () => {
        const result = await sendJsonRequest("/Challenge/DeleteCollection", "POST", { collectionId });
        if (result.success) {
            navigate("/Challenge");
        } else {
            setShowDelete(false);
            setErrors(result.error?.map(e => e.message) ?? ["Could not delete the collection"]);
        }
    };

    if (loading) {
        return <div className="d-flex justify-content-center py-5"><Loader /></div>;
    }

    if (notFound) {
        return (
            <div className="d-flex py-5 flex-column align-items-center text-center">
                <h4><FaSearch /></h4>
                <h5>Collection not found</h5>
                <Link to="/Challenge">Go back</Link>
            </div>
        );
    }

    const totalChallenges = sections.reduce((n, s) => n + s.challenges.length, 0);

    return (
        <Container className="py-4">
            <div className="wb-challenge-breadcrumb d-flex align-items-center gap-2">
                <Link to="/Challenge">Challenges</Link>
                <FaChevronRight size={10} className="text-muted opacity-50" />
                {!isNew && (
                    <>
                        <Link to={`/Challenge/Collection/${collectionId}`}>{title || "Collection"}</Link>
                        <FaChevronRight size={10} className="text-muted opacity-50" />
                    </>
                )}
                <span className="text-dark fw-medium">{isNew ? "New collection" : "Edit"}</span>
            </div>

            <h2 className="fs-3 fw-bold mb-4">{isNew ? "New collection" : "Edit collection"}</h2>

            <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Title</Form.Label>
                <Form.Control value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Coding Interview Preparation" />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Description</Form.Label>
                <MdEditorField
                    section="CourseEditor"
                    rootAlias="lesson-images"
                    text={description}
                    setText={setDescription}
                    placeHolder="What this collection is about..."
                    row={4}
                    isPost={false}
                    required={false}
                />
            </Form.Group>

            <Form.Check
                type="switch"
                id="collection-public"
                label="Public (visible to everyone)"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mb-4"
            />

            <div className="d-flex align-items-baseline justify-content-between mb-2">
                <h3 className="fs-5 fw-bold mb-0">Sections</h3>
                <span className="small text-muted">{sections.length} sections · {totalChallenges} challenges</span>
            </div>

            {sections.map((section, index) => {
                const inSection = new Set(section.challenges.map(c => c.id));
                return (
                    <Card key={section.key} className="mb-3">
                        <Card.Header className="d-flex align-items-center gap-2 bg-white">
                            <span className="text-muted fw-semibold">{index + 1}.</span>
                            <Form.Control
                                size="sm"
                                value={section.title}
                                maxLength={120}
                                placeholder="Section title"
                                onChange={(e) => updateSection(section.key, { title: e.target.value })}
                            />
                            <Button size="sm" variant="light" className="border" title="Move section up" disabled={index === 0}
                                onClick={() => setSections(list => move(list, index, -1))}>
                                <FaArrowUp size={10} />
                            </Button>
                            <Button size="sm" variant="light" className="border" title="Move section down" disabled={index === sections.length - 1}
                                onClick={() => setSections(list => move(list, index, 1))}>
                                <FaArrowDown size={10} />
                            </Button>
                            <Button size="sm" variant="outline-danger" title="Remove section"
                                onClick={() => setSections(list => list.filter(s => s.key !== section.key))}>
                                <FaTrash size={10} />
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                size="sm"
                                maxLength={1000}
                                className="mb-3"
                                value={section.description}
                                placeholder="Short description of the section (optional)"
                                onChange={(e) => updateSection(section.key, { description: e.target.value })}
                            />

                            {section.challenges.map((challenge, i) => (
                                <div key={challenge.id} className="wb-collection-edit-row d-flex align-items-center gap-2">
                                    <span className="text-muted small wb-collection-edit-index">{i + 1}</span>
                                    <span className="flex-grow-1 small">
                                        {challenge.title}
                                        {!challenge.isPublic && <FaLock size={10} className="text-muted ms-2" />}
                                    </span>
                                    <Badge bg="light" text="dark" className="border fw-normal">{challenge.difficulty}</Badge>
                                    <Button size="sm" variant="link" className="p-1 text-secondary" title="Move up" disabled={i === 0}
                                        onClick={() => updateSection(section.key, { challenges: move(section.challenges, i, -1) })}>
                                        <FaArrowUp size={10} />
                                    </Button>
                                    <Button size="sm" variant="link" className="p-1 text-secondary" title="Move down" disabled={i === section.challenges.length - 1}
                                        onClick={() => updateSection(section.key, { challenges: move(section.challenges, i, 1) })}>
                                        <FaArrowDown size={10} />
                                    </Button>
                                    <Button size="sm" variant="link" className="p-1 text-danger" title="Remove from section"
                                        onClick={() => updateSection(section.key, { challenges: section.challenges.filter(c => c.id !== challenge.id) })}>
                                        <FaTimes size={12} />
                                    </Button>
                                </div>
                            ))}
                            {section.challenges.length === 0 && <p className="small text-muted mb-2">No challenges yet.</p>}

                            {addingTo === section.key ? (
                                <div className="mt-2">
                                    <ChallengeSearchBox
                                        excludeIds={inSection}
                                        onSelect={(c) => updateSection(section.key, { challenges: [...section.challenges, c] })}
                                    />
                                    <Button size="sm" variant="link" className="px-0" onClick={() => setAddingTo(null)}>Done</Button>
                                </div>
                            ) : (
                                <Button size="sm" variant="outline-primary" className="mt-2 d-flex align-items-center gap-2" onClick={() => setAddingTo(section.key)}>
                                    <FaPlus size={10} /> Add challenges
                                </Button>
                            )}
                        </Card.Body>
                    </Card>
                );
            })}

            <Button variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2 mb-4" onClick={() => setSections(list => [...list, newSection()])}>
                <FaPlus size={10} /> Add section
            </Button>

            {errors.length > 0 && (
                <Alert variant="danger">
                    {errors.map((e, i) => <div key={i}>{e}</div>)}
                </Alert>
            )}

            <div className="d-flex gap-2">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : isNew ? "Create collection" : "Save changes"}</Button>
                <Button variant="light" className="border" onClick={() => navigate(isNew ? "/Challenge" : `/Challenge/Collection/${collectionId}`)}>Cancel</Button>
                {!isNew && (
                    <Button variant="outline-danger" className="ms-auto d-flex align-items-center gap-2" onClick={() => setShowDelete(true)}>
                        <FaTrash size={12} /> Delete collection
                    </Button>
                )}
            </div>

            <Modal show={showDelete} onHide={() => setShowDelete(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-5">Delete collection?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    "{title}" will be deleted. The challenges in it are not deleted and stay available in the challenge list.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" className="border" onClick={() => setShowDelete(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ChallengeCollectionEditPage;
