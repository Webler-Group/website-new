import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { Modal, Button, Form, Card, Spinner, Alert, Breadcrumb, Badge, Container } from "react-bootstrap";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { LinkContainer } from "react-router-bootstrap";
import { useAuth } from "../../auth/context/authContext";
import RequestResultAlert from "../../../components/RequestResultAlert";
import { AdminUser, BanUserData, DeleteUserFilesData, GetAdminUserData, IpRecord, ToggleBanIpData, UpdateRolesData } from "../types";
import RolesEnum from "../../../data/RolesEnum";

const ModViewPage = () => {
    const { userId } = useParams();
    const { sendJsonRequest } = useApi();
    const { userInfo } = useAuth();
    const [user, setUser] = useState<AdminUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [banNote, setBanNote] = useState("");

    const [rolesInput, setRolesInput] = useState("");
    const [rolesAlert, setRolesAlert] = useState<{ errors?: { message: string }[]; message?: string; }>({});

    const [showDeleteFilesModal, setShowDeleteFilesModal] = useState(false);
    const [deleteFilesAlert, setDeleteFilesAlert] = useState<{ errors?: { message: string }[]; message?: string; }>({});

    const [ipToBan, setIpToBan] = useState<IpRecord | null>(null);

    // Load user
    useEffect(() => {
        if (!userId) return;

        const fetchUser = async () => {
            setLoading(true);
            const result = await sendJsonRequest<GetAdminUserData>("/Admin/GetUser", "POST", { userId });
            if (result.data) {
                setUser(result.data.user);
                setRolesInput(result.data.user.roles.join(", "));
            }
            setLoading(false);
        };

        fetchUser();
    }, [userId, sendJsonRequest]);

    const handleBanToggle = async () => {
        if (!user) return;
        const result = await sendJsonRequest<BanUserData>("/Admin/BanUser", "POST", {
            userId: user.id,
            active: !user.active,
            note: banNote,
        });

        if (result.data) {
            setUser(prev => prev ? { ...prev, ...result.data } : null);
        }
        setShowModal(false);
        setBanNote("");
    };

    const handleUpdateRoles = async () => {
        if (!user) return;
        const newRoles = rolesInput.split(",").map(r => r.trim()).filter(r => r.length > 0);
        if (newRoles.length === 0) return;

        setLoading(true);
        const result = await sendJsonRequest<UpdateRolesData>("/Admin/UpdateRoles", "POST", {
            userId: user.id,
            roles: newRoles
        });

        if (result.data) {
            setUser(prev => prev ? { ...prev, ...result.data } : null);
            setRolesAlert({ message: "Roles updated successfully." });
            setRolesInput(result.data.roles.join(", "));
        } else {
            setRolesAlert({ errors: result.error });
        }

        setLoading(false);
    };

    const handleResetRoles = () => {
        if (!user) return;
        setRolesInput(user.roles.join(", "));
    };

    const handleDeleteUserFiles = async () => {
        if (!user) return;
        const result = await sendJsonRequest<DeleteUserFilesData>("/Admin/DeleteUserFiles", "POST", { userId: user.id });
        setShowDeleteFilesModal(false);
        if (result.data) {
            setDeleteFilesAlert({ message: `Deleted ${result.data.deletedCount} file(s) successfully.` });
        } else {
            setDeleteFilesAlert({ errors: result.error });
        }
    };

    const handleToggleBanIp = async () => {
        if (!ipToBan) return;
        const result = await sendJsonRequest<ToggleBanIpData>("/Admin/ToggleBanIp", "POST", {
            ipId: ipToBan.id,
            banned: !ipToBan.banned
        });
        if (result.data) {
            setUser(prev => prev ? {
                ...prev,
                ips: prev.ips.map(ip => ip.id === result.data!.id ? { ...ip, banned: result.data!.banned } : ip),
                lastIp: prev.lastIp?.id === result.data!.id ? { ...prev.lastIp, banned: result.data!.banned } : prev.lastIp
            } : null);
        }
        setIpToBan(null);
    };

    if (loading) return <div className="d-flex justify-content-center mt-5"><Spinner animation="border" /></div>;
    if (!user) return <Alert variant="warning">No user found</Alert>;

    const isAdmin = user.roles.includes(RolesEnum.ADMIN);

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
            <Modal show={!!ipToBan} onHide={() => setIpToBan(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{ipToBan?.banned ? "Unban IP" : "Ban IP"}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to {ipToBan?.banned ? "unban" : "ban"} <code>{ipToBan?.value}</code>?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setIpToBan(null)}>Cancel</Button>
                    <Button variant={ipToBan?.banned ? "success" : "danger"} onClick={handleToggleBanIp}>
                        {ipToBan?.banned ? "Unban" : "Ban"}
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
                        <ProfileAvatar avatarUrl={user.avatarUrl} size={96} />
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
                            <div>Last Login: {user.lastLoginDate ? new Date(user.lastLoginDate).toLocaleDateString("en") : "Never"}</div>
                            <div className="mt-3">
                                <LinkContainer to={`/Profile/${user.id}`}>
                                    <Button variant="primary">View Profile</Button>
                                </LinkContainer>
                            </div>
                        </div>
                    </Card.Body>
                </Card>

                {user.bio && <Card className="mb-3"><Card.Body><i>{user.bio}</i></Card.Body></Card>}

                <Card className="mb-3">
                    <Card.Body>
                        <Card.Title>IP Addresses</Card.Title>
                        {user.ips.length === 0 ? (
                            <span className="text-muted">No IPs recorded</span>
                        ) : (
                            <div className="d-flex flex-column gap-2">
                                {user.ips.map(ip => (
                                    <div key={ip.id} className="d-flex align-items-center gap-2">
                                        <code>{ip.value}</code>
                                        {ip.id === user.lastIp?.id && (
                                            <Badge bg="primary">last</Badge>
                                        )}
                                        {ip.banned && (
                                            <Badge bg="danger">banned</Badge>
                                        )}
                                        {userInfo?.roles.includes(RolesEnum.ADMIN) && (
                                            <Button
                                                size="sm"
                                                variant={ip.banned ? "outline-success" : "outline-danger"}
                                                onClick={() => setIpToBan(ip)}
                                            >
                                                {ip.banned ? "Unban" : "Ban"}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card.Body>
                </Card>

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

                {userInfo?.roles.includes(RolesEnum.ADMIN) && (
                    <>
                    <Modal show={showDeleteFilesModal} onHide={() => setShowDeleteFilesModal(false)} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Delete User Files</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <p>Are you sure you want to delete all files created by <b>{user.name}</b>? This cannot be undone.</p>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowDeleteFilesModal(false)}>Cancel</Button>
                            <Button variant="danger" onClick={handleDeleteUserFiles}>Delete Files</Button>
                        </Modal.Footer>
                    </Modal>
                    <Card className="mt-3">
                        <Card.Body>
                            <RequestResultAlert message={deleteFilesAlert.message} errors={deleteFilesAlert.errors} />
                            <Button variant="danger" onClick={() => setShowDeleteFilesModal(true)}>
                                Delete User Files
                            </Button>
                        </Card.Body>
                    </Card>
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
                    </>
                )}
            </Container>
        </>
    );
};

export default ModViewPage;
