import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button, Container, Form, FormGroup } from "react-bootstrap";
import PostTextareaControl from "../../../components/PostTextareaControl";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import InputTags from "../../../components/InputTags";

const FeedCreate = () => {
    const [message, setMessage] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { sendJsonRequest } = useApi();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        setError(null);

        const response = await sendJsonRequest("/Feed/CreateFeed", "POST", { 
            message,
            tags 
        });

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

                {/* Message Box */}
                <FormGroup className="mb-3">
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

                {/* Tags */}
                <FormGroup className="mb-3">
                    <label className="form-label fw-semibold">Tags</label>
                    <InputTags 
                        values={tags} 
                        setValues={setTags} 
                        placeholder="Add tags..." 
                    />
                    <div className="mt-1 text-muted small">
                        {tags.length}/10 tags selected
                    </div>
                </FormGroup>

                {/* Actions */}
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
