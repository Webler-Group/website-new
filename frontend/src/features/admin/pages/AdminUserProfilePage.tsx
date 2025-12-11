import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { Button, Form, Card, Spinner, Alert, Breadcrumb, Container, Row, Col, Modal } from "react-bootstrap";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { levelFromXP } from "../../../utils/UserUtils";

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

interface RolesSelectorProps {
  roles: string[];
  setRoles: (roles: string[]) => void;
}

const RolesSelector = ({ roles, setRoles }: RolesSelectorProps) => {

    const AVAILABLE_ROLES = [
        "User",
        "Creator",
        "Moderator",
        "Admin"
    ];

    const handleChange = (e: any) => {
        const selected = Array.from(e.target.selectedOptions).map((o:any) => o.value);
        setRoles(selected);
    };

    return (
        <Form.Group className="mb-3">
            <Form.Label><b>User Roles</b></Form.Label>
                <Form.Control
                    as="select"
                    multiple
                    size={"sm"}  // show 8 rows like Django
                    value={roles}
                    onChange={handleChange}
                    style={{
                        fontFamily: "monospace",
                        cursor: "pointer",
                    }}
                >
                    {AVAILABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                            {role}
                        </option>
                    ))}
                </Form.Control>
            <Form.Text muted>
                Hold <strong>Ctrl</strong> (or Cmd on Mac) to select multiple roles.
            </Form.Text>
        </Form.Group>
    );
}


const ModViewPage = () => {
    const { userId } = useParams();
    const { sendJsonRequest } = useApi();
    const [showModal, setShowModal] = useState(false);
    const [user, setUser] = useState<IAdminUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [banNote, setBanNote] = useState("");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [avatar, setAvatar] = useState("");
    const [avatarImageFile, setAvatarImageFile] = useState<File | null>(null);
    const [dateJoined, setDateJoined] = useState("");
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [emailVerified, setEmailVerified] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isBanned, setIsBanned] = useState(false);
    const [bio, setBio] = useState("");
    const [roles, setRoles] = useState<string[]>(["User"]);
    const [banReason, setBanReason] = useState("");

    useEffect(() => {
        setLevel(levelFromXP(xp));
    }, [xp]);

    // Load user
    useEffect(() => {
        if (!userId) return;

        const fetchUser = async () => {
            setLoading(true);
            const result = await sendJsonRequest("/Admin/GetUser", "POST", { userId });
            if (result && result.user) {
                const {name, email, avatarImage, registerDate, roles, bio, active, xp, verified} = result.user;
                setName(name);
                setEmail(email);
                setEmailVerified(verified);
                setDateJoined(registerDate);
                setRoles(roles);
                setBio(bio);
                setIsActive(active);
                setAvatar(avatarImage);
                setXp(xp);
                setIsBanned(result.user?.ban != null);
                if(result.user?.ban) setBanNote(result.user?.ban.note as string);
                setUser(result.user);
            }   
            setLoading(false);
        };

        fetchUser();
    }, [userId, sendJsonRequest]);


    const saveBasicInfo = async() => {
        if(avatarImageFile) {
            await sendJsonRequest("/Profile/UploadProfileAvatarImage", "POST",
                { avatarImage: avatarImageFile, userId: user?.id },
                {},
                true
            );
        }

        await sendJsonRequest("/Admin/UpdateUser", "POST", {
            userId: user?.id,
            name,
            email,
            isVerified: emailVerified,
            roles,
            isActive, xp, bio
        });
    }

    const onSaveHandler = async() => {
        setLoading(true);
        await saveBasicInfo();
        setLoading(false);
    }


    const handleBan = async () => {
        if (!user) return;
        const result = await sendJsonRequest("/Admin/BanUser", "POST", {
            userId: user.id,
            active: isActive,
            note: banNote,
        });

        if (result.success) {
            // const {name} = result.user;
            // console.log(result);
            setUser(prev => {
                if (!prev) return null;
                return { ...prev, active: result.data.active, ban: result.data.ban };
            })
        }
        setBanNote("");
    };


    // regular save logic
    const handleSave = async() => {
        if(isBanned || !isActive) {
            setShowModal(true);
            return;
        }
        await onSaveHandler();
    }


    // called if there is a potential ban action
    const handleCriticalAction = async() => {
        await onSaveHandler();
        setLoading(true);
        await handleBan();
        setLoading(false);
        setShowModal(false);
    }



    const handleIsActiveChange = (isChecked: boolean) => {
        setIsActive(isChecked);
        if(isChecked) {
            if(isBanned) setIsBanned(false);
        }
    }

    const handleIsBannedChange = (isChecked: boolean) => {
        setIsBanned(isChecked);
        setIsActive(!isChecked);
    }

    if (loading) return <div className="d-flex justify-content-center mt-5"><Spinner animation="border" /></div>;
    if (!user) return <Alert variant="warning">No user found</Alert>;

    return (
        <>
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{!user.active ? "Unban User" : "Ban User"}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>CRITICAL ACTIONS ON <b>{user.name}</b></p>
                    <ul>
                        {isBanned && <li className="text-danger">Ban user</li>}
                        { !isActive && <li className="text-danger">Deactivate account</li> }
                    </ul>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button onClick={() => handleCriticalAction()}>
                        Continue
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
                    { user && <Breadcrumb.Item active>{user.id}</Breadcrumb.Item> }
                </Breadcrumb>

                <Card className="p-4 shadow-sm">
                    <h3 className="mb-3">Admin: Manage User</h3>
                    {user && isBanned && (
                        <Alert variant="danger">
                            <Alert.Heading>User is Banned</Alert.Heading>
                            {/* <dl className="mb-0">
                                <dt>By</dt>
                                <dd>{user?.ban?.author}</dd>

                                <dt>Date</dt>
                                <dd>{new Date(user?.ban?.date as string).toLocaleString("en")}</dd>

                                {user?.ban?.note && (
                                    <>
                                        <dt>Note</dt>
                                        <dd>{user.ban.note}</dd>
                                    </>
                                )}
                            </dl> */}
                        </Alert>
                    )}
                    <Row>
                        {/* Left Column */}
                        <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label><b>Name</b></Form.Label>
                            <Form.Control
                            value={name} onChange={(e) => { setName(e.target.value) }} />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label><b>Email</b></Form.Label>
                            <Form.Control
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value) }}
                            />
                        </Form.Group>

                        <Row>
                            <Col>
                            <Form.Check
                                className="mb-3"
                                type="checkbox"
                                label="Email Verified"
                                checked={emailVerified}
                                onChange={(e) => { setEmailVerified(e.target.checked) }}
                            />
                            </Col>

                            <Col>
                            <Form.Group>
                                <Form.Label><b>Date Joined</b></Form.Label>
                                <p>{new Date(dateJoined).toLocaleDateString("en")}</p>
                            </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <RolesSelector roles={roles} setRoles={setRoles} />
                        </Form.Group>

                        <Form.Check
                            className="mt-3"
                            type="switch"
                            label="Active"
                            checked={isActive}
                            disabled={true}
                            onChange={(e) => { handleIsActiveChange(e.target.checked) }}
                        />
                        { !isActive && <small className="text-danger">Account Deactivation</small> }

                        <Form.Check
                            className="mt-3"
                            type="switch"
                            label="Ban User"
                            checked={ isBanned }
                            onChange={(e) => { handleIsBannedChange(e.target.checked) }}
                        />
                        { isBanned && <small className="text-danger">Account Ban</small> }

                        {isBanned && (
                            <Form.Group className="mt-3">
                                <Form.Label>Ban Reason</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value) }
                                />
                            </Form.Group>
                        )}
                        </Col>

                        {/* Right Column */}
                        <Col md={6}>
                        {/* Avatar */}
                        <Form.Group className="mb-4">
                            <Form.Label><b>Avatar Image</b></Form.Label>
                            <Form.Control
                                type="file"
                                onChange={(e: any) => {
                                    const files = (e.target as HTMLInputElement).files;
                                    if (files && files.length > 0) {
                                        setAvatarImageFile(files[0]);
                                    }
                            }}
                            />
                            {avatar && (
                                <ProfileAvatar avatarImage={avatar!} size={96} />
                            )}
                        </Form.Group>

                        {/* XP / Level */}
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label><b>XP</b></Form.Label>
                                    <Form.Control
                                    type="number"

                                    value={xp}
                                    onChange={(e) => { setXp(parseInt(e.target.value)) }}
                                    />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label><b>Level</b></Form.Label>
                                    <Form.Control
                                    type="number"
                                    value={level}
                                    readOnly
                                    disabled
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label><b>Bio</b></Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={6}
                                            value={bio}
                                            placeholder={"bio"}
                                            onChange={(e) => { setBio(e.target.value)}}
                                            maxLength={120}
                                            />
                                </Form.Group>
                            </Col>
                        </Row>
                        </Col>
                    </Row>

                    {/* Buttons */}
                    <div className="d-flex justify-content-between mt-4">
                        <div></div>

                        <div>
                            <Button className="me-2" onClick={handleSave} >
                                Save
                            </Button>
                            {
                                user && <Link to={`/Profile/${user.id}`}>View Profile</Link>
                            }
                        </div>
                    </div>
                </Card>
                
            </Container>
        </>
    );
};

export type { IAdminUser };

export default ModViewPage;
