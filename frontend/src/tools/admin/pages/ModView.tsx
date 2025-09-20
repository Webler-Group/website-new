import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { Modal, Button, Form, Card, Spinner, Alert, Breadcrumb, Badge, Container } from "react-bootstrap";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { LinkContainer } from "react-router-bootstrap";
import { useAuth } from "../../../features/auth/context/authContext";
import RequestResultAlert from "../../../components/RequestResultAlert";

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
    const { userInfo } = useAuth();
    const [user, setUser] = useState<IAdminUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [banNote, setBanNote] = useState("");

    const [rolesInput, setRolesInput] = useState("");
    const [rolesAlert, setRolesAlert] = useState<{ errors?: any[]; message?: string; }>({});

    // Load user
    useEffect(() => {
        if (!userId) return;

        const fetchUser = async () => {
            setLoading(true);
            const result = await sendJsonRequest("/Admin/GetUser", "POST", { userId });
            if (result && result.user) {
                setUser(result.user);
                setRolesInput(result.user.roles.join(", "));
            }   
            setLoading(false);
        };

        fetchUser();
    }, [userId, sendJsonRequest]);

    const handleBanToggle = async () => {
        if (!user) return;
        const result = await sendJsonRequest("/Admin/BanUser", "POST", {
            userId: user.id,
            active: !user.active,
            note: banNote,
        });

        if (result.success) {
            setUser(prev => {
                if (!prev) return null;
                return { ...prev, active: result.data.active, ban: result.data.ban };
            })
        }
        setShowModal(false);
        setBanNote("");
    };

    const handleUpdateRoles = async () => {
        if (!user) return;
        const newRoles = rolesInput.split(",").map(r => r.trim()).filter(r => r.length > 0);
        if (newRoles.length === 0) return;

        setLoading(true);
        const result = await sendJsonRequest("/Admin/UpdateRoles", "POST", {
            userId: user.id,
            roles: newRoles
        });

        if (result.success) {
            setUser(prev => prev ? { ...prev, roles: result.data.roles } : null);
            setRolesAlert({ message: "Roles updated successfully." });
            setRolesInput(result.data.roles.join(", "));
        } else {
            setRolesAlert({ errors: result?.error });
        }

        setLoading(false);
    };

    const handleResetRoles = () => {
        if (!user) return;
        setRolesInput(user.roles.join(", "));
    }

    if (loading) return <div className="d-flex justify-content-center mt-5"><Spinner animation="border" /></div>;
    if (!user) return <Alert variant="warning">No user found</Alert>;

    const isAdmin = user.roles.includes("Admin");

    return (
        <>
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{!user.active ? "Unban User" : "Ban User"}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {!user.active ? (
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
                                    maxLength={120}
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
                        variant={user.active ? "danger" : "success"}
                        onClick={handleBanToggle}
                    >
                        {user.active ? "Ban" : "Unban"}
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
                            <div>Registered: {new Date(user.registerDate).toLocaleDateString("en")}</div>
                            <div className="mt-3">
                                <LinkContainer to={`/Profile/${user.id}`}>
                                    <Button variant="primary">View Profile</Button>
                                </LinkContainer>
                            </div>
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

                {!isAdmin && (
                    <Button
                        variant={user.active ? "danger" : "success"}
                        onClick={() => setShowModal(true)}
                    >
                        {user.active ? "Ban User" : "Unban User"}
                    </Button>
                )}

                {userInfo?.roles.includes("Admin") && (
                    <Card className="mt-3">
                        <Card.Body>
                            <RequestResultAlert message={rolesAlert.message} errors={rolesAlert.errors} />
                            <Form.Group className="mb-2">
                                <Form.Label>Roles (comma separated)</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={rolesInput}
                                    onChange={e => setRolesInput(e.target.value)}
                                    placeholder="Enter roles separated by ,"
                                />
                            </Form.Group>
                            <div className="d-flex gap-2">
                                <Button
                                    variant="primary"
                                    onClick={handleUpdateRoles}
                                    disabled={loading}
                                >
                                    Update roles
                                </Button>
                                <Button variant="secondary" onClick={handleResetRoles}>
                                    Reset Roles
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                )}
            </Container>
        </>
    );
};

export type { IAdminUser };
export default ModView;
