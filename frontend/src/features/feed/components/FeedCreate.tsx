import { useState } from "react";
import { Button, Container, Form, FormGroup, ToggleButtonGroup, ToggleButton } from "react-bootstrap";
import PostTextareaControl from "../../../components/PostTextareaControl";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import MarkdownRenderer from "../../../components/MarkdownRenderer";

const FeedCreate = () => {
    const [message, setMessage] = useState('');
    const [tags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"write" | "preview">("write"); // <-- toggle state
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
        <Container className="min-vh-100">
            <h2 className="fw-semibold my-3">Create New Post</h2>
            <Form onSubmit={handleSubmit}>
                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {/* Toggle Write/Preview */}
                <div className="mb-3">
                    <ToggleButtonGroup
                        type="radio"
                        name="editorMode"
                        value={mode}
                        onChange={(val: any) => setMode(val)}
                    >
                        <ToggleButton id="write-btn" value="write" variant="outline-primary">
                            Write
                        </ToggleButton>
                        <ToggleButton id="preview-btn" value="preview" variant="outline-primary">
                            Preview
                        </ToggleButton>
                    </ToggleButtonGroup>
                </div>

                {/* Write Mode */}
                {mode === "write" && (
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
                )}

                {/* Preview Mode */}
                {mode === "preview" && (
                    <div className="p-3 border rounded bg-light">
                        {message.trim() ? (
                            <MarkdownRenderer content={message} allowedUrls={["http", /^\/Profile\//]} />
                        ) : (
                            <span className="text-muted">Nothing to preview</span>
                        )}
                    </div>
                )}

                {/* Tags */}
                {/* <FormGroup className="mb-3 mt-3">
                    <label className="form-label fw-semibold">Tags</label>
                    <InputTags 
                        values={tags} 
                        setValues={setTags} 
                        placeholder="Add tags..." 
                    />
                    <div className="mt-1 text-muted small">
                        {tags.length}/10 tags selected
                    </div>
                </FormGroup> */}

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
                        Post
                    </Button>
                </div>
            </Form>
        </Container>
    );
}

export default FeedCreate;
