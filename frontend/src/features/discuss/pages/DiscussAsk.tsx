import { FormEvent, useEffect, useState } from 'react'
import { Alert, Button, Form, FormControl, FormGroup, FormLabel, Modal } from 'react-bootstrap'
import InputTags from '../../../components/InputTags';
import { LinkContainer } from 'react-router-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../context/apiCommunication';

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

    if (questionId) {
        useEffect(() => {
            getQuestion();
        }, [])
    }

    const getQuestion = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Discussion/GetQuestion`, "POST", {
            questionId
        });
        if (result && result.question) {
            setTitle(result.question.title);
            setMessage(result.question.message);
            setTags(result.question.tags);
        }
        setLoading(false);
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        setLoading(true);
        questionId ?
            await editQuestion()
            :
            await createQuestion();
        setLoading(false);

    }

    const createQuestion = async () => {
        setError("");
        const result = await sendJsonRequest("/Discussion/CreateQuestion", "POST", { title, message, tags });
        if (result && result.question) {
            navigate("/Discuss");
        }
        else {
            setError(result.error ? result.error.message : result.message);
        }
    }

    const editQuestion = async () => {
        setError("");
        const result = await sendJsonRequest("/Discussion/EditQuestion", "PUT", { questionId, title, message, tags });
        if (result && result.success) {
            navigate("/Discuss");
        }
        else {
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
            navigate("/Discuss")
        }
        else {
            setError(result.error ? result.error.message : result.message);
        }
        setLoading(false);
    }

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
            <Form onSubmit={handleSubmit}>
                {error && <Alert variant="danger">{error}</Alert>}
                <FormGroup>
                    <FormLabel>Your question</FormLabel>
                    <FormControl placeholder="What would you like to know?" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
                    <p className="text-secondary">Tip: write as if asking a friend, being as specific as possible</p>
                </FormGroup>
                <FormGroup>
                    <FormLabel>Description</FormLabel>
                    <FormControl placeholder="Include as much detail as possible to get the most relevant answers." as="textarea" rows={8} maxLength={1000} required value={message} onChange={(e) => setMessage(e.target.value)} />
                </FormGroup>
                <FormGroup>
                    <FormLabel>Tags</FormLabel>
                    <InputTags values={tags} setValues={setTags} placeholder="Add tag..." />
                    <p className="text-secondary">You can add up to 10 tags</p>
                </FormGroup>
                <div className="d-flex justify-content-end">
                    <LinkContainer to="/Discuss">
                        <Button type="button" variant="secondary" disabled={loading}>Cancel</Button>
                    </LinkContainer>
                    {
                        questionId ?
                            <>
                                <Button variant="secondary" className="ms-2" type="button" onClick={() => setDeleteModalVisible(true)} disabled={loading}>Delete</Button>
                                <Button variant="primary" className="ms-2" type="submit" disabled={loading}>Save changes</Button>
                            </>
                            :
                            <>
                                <Button className="ms-2" variant="primary" type="submit" disabled={loading}>Post question</Button>
                            </>
                    }
                </div>
            </Form>
        </>
    )
}

export default AskQuestion