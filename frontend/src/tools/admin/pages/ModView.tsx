import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { Modal, Button, Form, Card, Spinner, Alert, Breadcrumb, Badge, Container } from "react-bootstrap";
import ProfileAvatar from "../../../components/ProfileAvatar";

interface IAdminUser {
    id: string;
    name: string;
    email: string;
    avatarImage?: string;
    roles: string[];
    verified: boolean;
    active: boolean;
    registerDate: string;
    bio?: string;
    ban: {
        author: string;
        note?: string;
        date: string;
    } | null;
}

const ModView = () => {
    const { userId } = useParams();
    const { sendJsonRequest } = useApi();

    const [user, setUser] = useState<IAdminUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [banNote, setBanNote] = useState("");

    // Load user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);
                const res = await sendJsonRequest("/Admin/GetUser", "POST", { userId });
                setUser(res.user);
            } catch (err: any) {
                setError(err.message || "Failed to load user");
            } finally {
                setLoading(false);
            }
        };
        if (userId) fetchUser();
    }, [userId, sendJsonRequest]);

    const handleBanToggle = async () => {
        if (!userId) return;
        try {
            const res = await sendJsonRequest("/Admin/BanUser", "POST", {
                userId,
                active: !!user?.ban, // if banned → unban
                note: !user?.ban ? banNote || undefined : undefined,
            });

            if (res.success) {
                setUser(prev => {
                    if (!prev) return null;
                    return { ...prev, active: res.data.active, ban: res.data.ban };
                })
            }
            setShowModal(false);
            setBanNote("");
        } catch (err: any) {
            setError(err.message || "Action failed");
        }
    };

    if (loading) return <div className="d-flex justify-content-center mt-5"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (!user) return <Alert variant="warning">No user found</Alert>;

    const isAdmin = user.roles.includes("Admin");

    return (
        <>
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{user.ban ? "Unban User" : "Ban User"}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {user.ban ? (
                        <p>Are you sure you want to unban <b>{user.name}</b>?</p>
                    ) : (
                        <>
                            <p>Are you sure you want to ban <b>{user.name}</b>?</p>
                            <Form.Group className="mb-3">
                                <Form.Label>Ban Note (optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={banNote}
                                    onChange={e => setBanNote(e.target.value)}
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant={user.ban ? "success" : "danger"}
                        onClick={handleBanToggle}
                    >
                        {user.ban ? "Unban" : "Ban"}
                    </Button>
                </Modal.Footer>
            </Modal>
            <Container className="mt-4">
                <Breadcrumb>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/Admin" }}>
                        Admin Panel
                    </Breadcrumb.Item>
                    <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/Admin/UserSearch" }}>
                        User Search
                    </Breadcrumb.Item>
                    <Breadcrumb.Item active>{user.name}</Breadcrumb.Item>
                </Breadcrumb>

                <Card className="mb-3">
                    <Card.Body className="d-flex gap-2">
                        <ProfileAvatar avatarImage={user.avatarImage!} size={96} />
                        <div>
                            <Card.Title>{user.name}</Card.Title>
                            <Card.Subtitle className="text-muted">{user.email}</Card.Subtitle>
                            <div className="mt-2">
                                {user.roles.map(role => (
                                    <Badge key={role} bg="secondary" className="me-1">
                                        {role}
                                    </Badge>
                                ))}
                            </div>
                            <div>Verified: {user.verified ? "Yes" : "No"}</div>
                            <div>Active: {user.active ? "Yes" : "No"}</div>
                            <div>Registered: {new Date(user.registerDate).toLocaleString()}</div>
                        </div>
                    </Card.Body>
                </Card>

                {user.bio && <Card className="mb-3"><Card.Body><i>{user.bio}</i></Card.Body></Card>}

                {user.ban != null && (
                    <Alert variant="danger">
                        <Alert.Heading>User is Banned</Alert.Heading>
                        <dl className="mb-0">
                            <dt>By</dt>
                            <dd>{user.ban.author}</dd>

                            <dt>Date</dt>
                            <dd>{new Date(user.ban.date).toLocaleString("en")}</dd>

                            {user.ban.note && (
                                <>
                                    <dt>Note</dt>
                                    <dd>{user.ban.note}</dd>
                                </>
                            )}
                        </dl>
                    </Alert>

                )}

                {/* Show Ban/Unban only if not admin */}
                {!isAdmin && (
                    <Button
                        variant={user.ban ? "success" : "danger"}
                        onClick={() => setShowModal(true)}
                    >
                        {user.ban ? "Unban User" : "Ban User"}
                    </Button>
                )}
            </Container>
        </>
    );
};

export type { IAdminUser };
export default ModView;
