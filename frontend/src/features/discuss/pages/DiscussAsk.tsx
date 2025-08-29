import { useEffect, useState } from 'react'
import { Alert, Button, FormControl, FormGroup, FormLabel, Modal } from 'react-bootstrap'
import InputTags from '../../../components/InputTags';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../context/apiCommunication';
import PostTextareaControl from '../../../components/PostTextareaControl';

interface AskQuestionProps {
    questionId: string | null;
}

const AskQuestion = ({ questionId }: AskQuestionProps) => {
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [deleteModalVisiblie, setDeleteModalVisible] = useState(false);

    useEffect(() => {
        if (questionId) {
            getQuestion();
        }
    }, [questionId]);

    const getQuestion = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Discussion/GetQuestion`, "POST", { questionId });
        if (result && result.question) {
            setTitle(result.question.title);
            setMessage(result.question.message);
            setTags(result.question.tags);
        }
        setLoading(false);
    }

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        if (questionId) {
            await editQuestion();
        } else {
            await createQuestion();
        }

        setLoading(false);
    }

    const createQuestion = async () => {
        const result = await sendJsonRequest("/Discussion/CreateQuestion", "POST", { title, message, tags });
        if (result && result.question) {
            navigate("/Discuss");
        } else {
            setError(result.error ? result.error.message : result.message);
        }
    }

    const editQuestion = async () => {
        const result = await sendJsonRequest("/Discussion/EditQuestion", "PUT", { questionId, title, message, tags });
        if (result && result.success) {
            navigate("/Discuss/" + questionId);
        } else {
            setError(result.error ? result.error.message : result.message);
        }
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const handleDeletePost = async () => {
        setLoading(true);
        const result = await sendJsonRequest("/Discussion/DeleteQuestion", "DELETE", { questionId });
        if (result && result.success) {
            closeDeleteModal();
            navigate("/Discuss");
        } else {
            setError(result.error ? result.error.message : result.message);
        }
        setLoading(false);
    }

    let disabled = loading || title.trim().length == 0 || message.trim().length == 0;

    return (
        <>
            <Modal show={deleteModalVisiblie} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Your question will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeletePost}>Delete</Button>
                </Modal.Footer>
            </Modal>

            {questionId === null && <h2 className="mb-4">Ask the community a question</h2>}

            <div className='small'>
                {error && <Alert variant="danger" dismissible>{error}</Alert>}

                <FormGroup>
                    <FormLabel>Your question</FormLabel>
                    <FormControl
                        size='sm'
                        placeholder="What would you like to know?"
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <p className="text-secondary">
                        Tip: write as if asking a friend, being as specific as possible
                    </p>
                </FormGroup>

                <FormGroup>
                    <FormLabel>Description</FormLabel>
                    <PostTextareaControl
                        size='sm'
                        placeholder="Include as much detail as possible to get the most relevant answers."
                        rows={10}
                        maxLength={4096}
                        required
                        value={message}
                        setValue={setMessage}
                    />
                </FormGroup>

                <FormGroup>
                    <FormLabel>Tags</FormLabel>
                    <InputTags
                        values={tags}
                        setValues={setTags}
                        placeholder="Add tag..."
                    />
                </FormGroup>

                <div className="mt-2 d-flex justify-content-end">
                    <LinkContainer to={questionId ? "/Discuss/" + questionId : "/Discuss"}>
                        <Button size='sm' type="button" variant="secondary" disabled={loading}>
                            Cancel
                        </Button>
                    </LinkContainer>

                    {questionId ? (
                        <>
                            <Button
                                size='sm'
                                variant="secondary"
                                className="ms-2"
                                type="button"
                                onClick={() => setDeleteModalVisible(true)}
                                disabled={loading}
                            >
                                Delete
                            </Button>
                            <Button
                                size='sm'
                                variant="primary"
                                className="ms-2"
                                type="button"
                                onClick={handleSubmit}
                                disabled={disabled}
                            >
                                Save changes
                            </Button>
                        </>
                    ) : (
                        <Button
                            size='sm'
                            className="ms-2"
                            variant="primary"
                            type="button"
                            onClick={handleSubmit}
                            disabled={disabled}
                        >
                            Post question
                        </Button>
                    )}
                </div>
            </div>
        </>
    )
}

export default AskQuestion
