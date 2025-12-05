import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import RequestResultAlert from "../../../components/RequestResultAlert";
import MdEditorField from "../../../components/MdEditorField";

const FeedCreatePage = () => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any[] | undefined>();
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
        <div className="p-2">
            <h2 className="fw-semibold my-3">Create New Post</h2>
            <Form onSubmit={handleSubmit}>
                <RequestResultAlert errors={error} />

                <MdEditorField 
                    text={message}
                    setText={setMessage}
                    row={10}
                    placeHolder={"What's on your mind"}
                />

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
