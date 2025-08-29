import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button, Container, Form, FormGroup } from "react-bootstrap";
import PostTextareaControl from "../../../components/PostTextareaControl";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";

const FeedCreate = () => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { sendJsonRequest } = useApi();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        setError(null);

        const response = await sendJsonRequest("/Feed/CreateFeed", "POST", { message });
        if (response.success) {
            navigate("/Feed/" + response.feed.id);
        } else {
            setError(response.message ?? "Failed to create feed");
        }

        setLoading(false);
    };

    const handleClose = () => {
        navigate("/Feed");
    }

    return (
        <Container>
            <h2 className="fw-semibold my-3">Create New Post</h2>
            <Form onSubmit={handleSubmit}>
                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                <FormGroup>
                    <PostTextareaControl
                        rows={10}
                        placeholder="What's on your mind?"
                        value={message}
                        setValue={setMessage}
                        required
                        maxLength={2000}
                    />

                    <div className="mt-2 text-muted small">
                        {message.length}/2000 characters
                    </div>
                </FormGroup>

                <div className="d-flex justify-content-end gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={!message.trim() || loading}
                    >
                        {loading && <Loader2 size={16} className="spinner-border spinner-border-sm" />}
                        {loading ? 'Posting...' : 'Post'}
                    </Button>
                </div>
            </Form>
        </Container>
    );
}

export default FeedCreate;