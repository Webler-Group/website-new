import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, Button, InputGroup } from "react-bootstrap";
import { FaArrowLeft, FaRedo } from "react-icons/fa";
import { useApi } from "../../../context/apiCommunication";
import { FeedSuggestedUserData } from "../types";
import { UserMinimal } from "../../profile/types";
import { useAuth } from "../../auth/context/authContext.tsx";
import NotificationToast from "../../../components/NotificationToast.tsx";
import FollowListProfile from "../../profile/components/FollowListProfile.tsx";
import Loader from "../../../components/Loader.tsx";

export default function FeedSuggestedUserListPage() {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState<UserMinimal[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const result = await sendJsonRequest<FeedSuggestedUserData>("/Feed/Users/Suggestion", "POST", {
                searchQuery: activeQuery
            });
            setUsers(result.data?.users ?? []);
            setLoading(false);
        };
        void fetchUsers();
    }, [activeQuery, reloadKey]);

    const handleSearch = () => {
        setActiveQuery(query);
        setReloadKey(0);
    };

    const handleReload = () => {
        setReloadKey(prev => prev + 1);
    };

    const handleInvite = async () => {
        const link = `${window.location.host}/Profile/${userInfo?.id}`;
        await navigator.clipboard.writeText(link);
        setNotification({ type: "success", message: "Link copied!" });
    };

    return (
        <Container className="py-4" style={{ maxWidth: "700px" }}>
            <NotificationToast notification={notification} onClose={() => setNotification(null)} />

            <Row className="mb-2">
                <Col>
                    <button className="btn btn-link btn-sm text-muted p-0 text-decoration-none" onClick={() => navigate("/Feed")}>
                        <FaArrowLeft className="me-1" /> Back to Feed
                    </button>
                </Col>
            </Row>

            <Row className="mb-3 g-2">
                <Col>
                    <InputGroup size="sm">
                        <Form.Control
                            placeholder="Search users..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <Button variant="primary" onClick={handleSearch}>
                            Search
                        </Button>
                    </InputGroup>
                </Col>
                <Col xs="auto" className="d-flex gap-2">
                    <Button size="sm" variant="outline-secondary" onClick={handleReload} title="Reload">
                        <FaRedo />
                    </Button>
                    <Button size="sm" variant="outline-primary" onClick={handleInvite}>
                        Invite Friend
                    </Button>
                </Col>
            </Row>

            <div>
                {users.map((user) => (
                    <div key={user.id} className="mb-3">
                        <FollowListProfile
                            user={user}
                            viewedUserId={null}
                        />
                    </div>
                ))}

                {loading && (
                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                        <Loader />
                    </div>
                )}

                {!loading && users.length === 0 && (
                    <p className="text-center mt-3 text-muted">No users found</p>
                )}
            </div>
        </Container>
    );
}
