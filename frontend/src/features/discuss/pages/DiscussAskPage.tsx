import { useEffect, useState } from 'react'
import { Button, FormControl, FormGroup, FormLabel, Modal } from 'react-bootstrap'
import InputTags from '../../../components/InputTags';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../context/apiCommunication';
import PostTextareaControl from '../../../components/PostTextareaControl';
import RequestResultAlert from '../../../components/RequestResultAlert';
import PostAttachmentSelect from '../../../components/PostAttachmentSelect';

const MAX_LENGTH = 4096;

interface DiscussAskPageProps {
    questionId: string | null;
}

const DiscussAskPage = ({ questionId }: DiscussAskPageProps) => {
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any[] | undefined>();
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
        setError(undefined);

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
            navigate("/Discuss/" + result.question.id);
        } else {
            setError(result.error);
        }
    }

    const editQuestion = async () => {
        const result = await sendJsonRequest("/Discussion/EditQuestion", "PUT", { questionId, title, message, tags });
        if (result && result.success) {
            navigate("/Discuss/" + questionId);
        } else {
            setError(result.error);
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
            navigate("/Discuss?filter=3");
        } else {
            setError(result?.error ? result.error.message : result.message);
        }
        setLoading(false);
    }

    const handlePostAttachments = (selected: string[]) => {
        setMessage(prev => (prev.trim().length == 0 || prev.endsWith("\n") ? prev : prev + "\n") + selected.join("\n") + "\n");
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

            <div className='d-flex flex-column gap-2'>
                <RequestResultAlert errors={error} />

                <FormGroup>
                    <FormLabel>Your question</FormLabel>
                    <FormControl
                        placeholder="What would you like to know?"
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </FormGroup>

                <FormGroup>
                    <FormLabel>Description</FormLabel>
                    <PostTextareaControl
                        placeholder="Include as much detail as possible to get the most relevant answers."
                        rows={10}
                        maxLength={MAX_LENGTH}
                        required
                        value={message}
                        setValue={setMessage}
                    />
                    <div className='d-flex justify-content-between'>
                        <div className="mt-2 text-muted small">
                            {message.length}/{MAX_LENGTH} characters
                        </div>
                        <PostAttachmentSelect onSubmit={handlePostAttachments} />
                    </div>
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
                        <Button type="button" variant="secondary" disabled={loading}>
                            Cancel
                        </Button>
                    </LinkContainer>

                    {questionId ? (
                        <>
                            <Button
                                variant="secondary"
                                className="ms-2"
                                type="button"
                                onClick={() => setDeleteModalVisible(true)}
                                disabled={loading}
                            >
                                Delete
                            </Button>
                            <Button
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

export default DiscussAskPage
