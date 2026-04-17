import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, Button, InputGroup } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import { useApi } from "../../../context/apiCommunication";
import { FeedSuggestedUserData } from "../types";
import { UserMinimal } from "../../profile/types";
import { useAuth } from "../../auth/context/authContext.tsx";
import NotificationToast from "../../../components/NotificationToast.tsx";
import FollowListProfile from "../../profile/components/FollowListProfile.tsx";

const COUNT = 20;

export default function FeedSuggestedUserListPage() {
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState<UserMinimal[]>([]);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const intObserver = useRef<IntersectionObserver>(null);
    const lastUserRef = useCallback((node: HTMLDivElement | null) => {
        if (loading) return;
        if (intObserver.current) intObserver.current.disconnect();
        intObserver.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                setPage(prev => prev + 1);
            }
        });
        if (node) intObserver.current.observe(node);
    }, [loading, hasNextPage]);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const result = await sendJsonRequest<FeedSuggestedUserData>("/Feed/Users/Suggestion", "POST", {
                searchQuery: activeQuery,
                page,
                count: COUNT
            });
            const newUsers = result.data?.users ?? [];
            setUsers(prev => page === 1 ? newUsers : [...prev, ...newUsers]);
            setHasNextPage(newUsers.length === COUNT);
            setLoading(false);
        };
        void fetchUsers();
    }, [page, activeQuery]);

    const handleSearch = () => {
        setActiveQuery(query);
        setPage(1);
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
                <Col xs="auto">
                    <Button size="sm" variant="outline-primary" onClick={handleInvite}>
                        Invite Friend
                    </Button>
                </Col>
            </Row>

            <div>
                {users.map((user, i) => {
                    const isLast = i === users.length - 1;
                    return (
                        <div key={user.id} className="mb-3">
                            <FollowListProfile
                                ref={isLast ? lastUserRef : undefined}
                                user={user}
                                viewedUserId={null}
                            />
                        </div>
                    );
                })}

                {loading && <p className="text-center mt-3">Loading...</p>}

                {!loading && users.length === 0 && (
                    <p className="text-center mt-3 text-muted">No users found</p>
                )}
            </div>
        </Container>
    );
}
