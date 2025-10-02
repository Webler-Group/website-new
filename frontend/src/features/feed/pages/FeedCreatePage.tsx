import { useState } from "react";
import { Button, Form, FormGroup, ToggleButtonGroup, ToggleButton } from "react-bootstrap";
import PostTextareaControl from "../../../components/PostTextareaControl";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import RequestResultAlert from "../../../components/RequestResultAlert";
import allowedUrls from "../../../data/discussAllowedUrls";
import React from "react";
import MarkdownRenderer from "../../../components/MarkdownRenderer";

const MAX_LENGTH = 4096;

const FeedCreatePage = () => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any[] | undefined>();
    const [mode, setMode] = useState<"write" | "preview">("write"); // <-- toggle state
    const navigate = useNavigate();
    const { sendJsonRequest } = useApi();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        setError(undefined);

        const result = await sendJsonRequest("/Feed/CreateFeed", "POST", {
            message
        });

        if (result.success) {
            navigate("/Feed/" + result.feed.id);
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    const handleClose = () => {
        navigate("/Feed");
    }

    return (
        <div>
            <h2 className="fw-semibold my-3">Create New Post</h2>
            <Form onSubmit={handleSubmit}>
                <RequestResultAlert errors={error} />

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
                            maxLength={MAX_LENGTH}
                        />
                        <div className="mt-2 text-muted small">
                            {message.length}/{MAX_LENGTH} characters
                        </div>
                    </FormGroup>
                )}

                {/* Preview Mode */}
                {mode === "preview" && (
                    <div className="p-3 border rounded bg-light">
                        <div className="wb-feed-content__message">
                            <MarkdownRenderer content={message} allowedUrls={allowedUrls} />
                        </div>
                    </div>
                )}

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
        </div>
    );
}

export default FeedCreatePage;
