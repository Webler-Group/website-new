import { useEffect, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import RequestResultAlert from "../../../components/RequestResultAlert";
import MdEditorField from "../../../components/MdEditorField";

interface FeedCreatePageProps {
    feedId: string | null;
}

const FeedCreatePage = ({ feedId }: FeedCreatePageProps) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any[] | undefined>();
    const navigate = useNavigate();
    const { sendJsonRequest } = useApi();

    useEffect(() => {
        if (feedId) {
            getFeed();
        }
    }, [feedId]);

    const getFeed = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Feed/GetFeed`, "POST", { feedId });
        if (result && result.feed) {
            setMessage(result.feed.message);
        }
        setLoading(false);
    }

    const createFeed = async () => {
        const result = await sendJsonRequest("/Feed/CreateFeed", "POST", {
            message
        });

        if (result.success) {
            navigate("/Feed/" + result.feed.id);
        } else {
            setError(result.error);
        }
    }

    const editFeed = async () => {
        const result = await sendJsonRequest("/Feed/EditFeed", "PUT", {
            feedId: feedId,
            message
        });

        if (result.success) {
            navigate("/Feed/" + result.data.id);
        } else {
            setError(result.error);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        setError(undefined);

        if (feedId) {
            await editFeed();
        } else {
            await createFeed();
        }

        setLoading(false);
    };

    const handleClose = () => {
        navigate("/Feed");
    }

    return (
        <div className="p-2">
            <h2 className="fw-semibold my-3">{feedId ? "Edit Post" : "Create New Post"}</h2>
            <Form onSubmit={handleSubmit}>
                <RequestResultAlert errors={error} />

                <MdEditorField
                    section="Profile"
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
                        {feedId ? "Save" : "Post"}
                    </Button>
                </div>
            </Form>
        </div>
    );
}

export default FeedCreatePage;
