import { IChannel } from "../components/ChannelListItem";
import { useEffect, useState } from "react";
import {
    Button,
    Form,
    ListGroup,
    Nav,
    Tab,
    Row,
    Col,
    Badge,
    InputGroup,
    Alert,
    Modal
} from "react-bootstrap";
import { useAuth } from "../../auth/context/authContext";
import ProfileAvatar from "../../../components/ProfileAvatar";
import ProfileName from "../../../components/ProfileName";
import { useApi } from "../../../context/apiCommunication";
import { IChannelInvite } from "../components/InvitesListItem";
import { FaPen } from "react-icons/fa6";
import ToggleSwitch from "../../../components/ToggleSwitch";

interface ChannelRoomSettingsProps {
    channel: IChannel;
    onUserRemove: (userId: string) => void;
    onUserInvite: (invite: IChannelInvite) => void;
    onCancelInvite: (inviteId: string) => void;
    onTitleChange: (title: string) => void;
    onRoleChange: (userId: string, role: string) => void;
    onToggleNotifications: (enabled: boolean) => void;
}

const ChannelRoomSettings = ({ channel, onUserInvite, onUserRemove, onCancelInvite, onTitleChange, onRoleChange, onToggleNotifications }: ChannelRoomSettingsProps) => {
    const [activeTab, setActiveTab] = useState("general");
    const [inviteUsername, setInviteUsername] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const { userInfo } = useAuth();
    const { sendJsonRequest } = useApi();
    const [inviteMessage, setInviteMessage] = useState(["", ""]);
    const [changeTitleMessage, setChangeTitleMessage] = useState(["", ""]);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [leaveModalVisible, setLeaveModalVisible] = useState(false);
    const [editedParticipantId, setEditedParticipantId] = useState<string | null>(null);
    const [editedParticipantRole, setEditedParticipantRole] = useState<string>("");

    useEffect(() => {
        setActiveTab("general");
    }, [channel?.id]);

    useEffect(() => {
        setInviteMessage(["", ""]);
        setChangeTitleMessage(["", ""]);
        if (activeTab == "general") {
            setNewTitle(channel.title ?? "");
            setNotificationsEnabled(!channel.muted);
        }
    }, [activeTab]);

    const currentUser = channel.participants?.find(x => x.userId == userInfo?.id);

    const isOwner = currentUser?.role === "Owner";
    const isAdmin = isOwner || currentUser?.role === "Admin";

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const closeLeaveModal = () => {
        setLeaveModalVisible(false);
    }

    const closeParticipantModal = () => {
        setEditedParticipantId(null);
        setEditedParticipantRole("");
    }

    const handleInvite = async () => {
        const result = await sendJsonRequest("/Channels/GroupInviteUser", "POST", {
            channelId: channel.id,
            username: inviteUsername.trim()
        });
        if (result && result.invite) {
            setInviteMessage(["success", "Invite created successfully"]);
            onUserInvite({
                ...result.invite,
                authorId: userInfo?.id,
                authorName: userInfo?.name,
                authorAvatar: userInfo?.avatarImage
            });
            setInviteUsername("");
        } else {
            setInviteMessage(["danger", result.message ?? "Invite failed"])
        }
    };

    const handleRemove = async () => {
        if (!editedParticipantId) return;
        const result = await sendJsonRequest("/Channels/GroupRemoveUser", "POST", {
            channelId: channel.id,
            userId: editedParticipantId
        });
        if (result && result.success) {
            onUserRemove(editedParticipantId);
            closeParticipantModal();
        }
    };

    const handleRoleSave = async () => {
        if (editedParticipantId && editedParticipantRole) {
            const result = await sendJsonRequest("/Channels/GroupChangeRole", "POST", {
                channelId: channel.id,
                userId: editedParticipantId,
                role: editedParticipantRole
            });
            if (result && result.success) {
                onRoleChange(result.data.userId, result.data.role);
                closeParticipantModal();
            }
        }
    };

    const handleTitleChange = async () => {
        if (channel.title == newTitle.trim()) return;
        const result = await sendJsonRequest("/Channels/GroupRename", "POST", {
            channelId: channel.id,
            title: newTitle.trim()
        });
        if (result && result.success) {
            setChangeTitleMessage(["success", "Title changed successfully"]);
            onTitleChange(result.data.title);
        } else {
            setChangeTitleMessage(["danger", result?.message ?? "Title failed to change"]);
        }
    };

    const handleLeave = async () => {
        await sendJsonRequest("/Channels/LeaveChannel", "POST", {
            channelId: channel.id
        });
    };

    const handleDeleteChannel = async () => {
        await sendJsonRequest("/Channels/DeleteChannel", "POST", {
            channelId: channel.id
        })
    };

    const handleCancelInvite = async (inviteId: string) => {
        const result = await sendJsonRequest("/Channels/GroupCancelInvite", "POST", {
            inviteId
        });
        if (result && result.success) {
            onCancelInvite(inviteId);
        }
    }

    const toggleNotifications = async (enabled: boolean) => {
        const result = await sendJsonRequest("/Channels/MuteChannel", "POST", {
            channelId: channel.id,
            muted: !enabled
        });
        if (result && result.success) {
            onToggleNotifications(enabled);
            setNotificationsEnabled(!result.data.muted);
        }
        else {

        }
    }

    const selectedParticipant = channel.participants?.find(x => x.userId == editedParticipantId);

    return (
        <>
            {/* Delete Channel Modal */}
            <Modal show={deleteModalVisible} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Channel will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteChannel}>Delete</Button>
                </Modal.Footer>
            </Modal>

            {/* Leave Channel Modal */}
            <Modal show={leaveModalVisible} onHide={closeLeaveModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>You won't be able to join again unless you are reinvited.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeLeaveModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleLeave}>Leave</Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Participant Modal */}
            <Modal show={editedParticipantId !== null} onHide={closeParticipantModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedParticipant?.userName}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedParticipant && (
                        <Form.Group controlId="participantRole">
                            <Form.Label>Role</Form.Label>
                            <Form.Select
                                size="sm"
                                value={editedParticipantRole || selectedParticipant.role}
                                onChange={(e) => setEditedParticipantRole(e.target.value)}
                                disabled={!isOwner}
                            >
                                <option value="Owner">Owner</option>
                                <option value="Admin">Admin</option>
                                <option value="Member">Member</option>
                            </Form.Select>

                            {(editedParticipantRole === "Owner" && isOwner) && (
                                <div className="mt-2 text-sm text-warning">
                                    By assigning this user as Owner, your role will be changed to Admin.
                                </div>
                            )}
                        </Form.Group>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button size="sm" variant="secondary" onClick={closeParticipantModal}>Cancel</Button>
                    <Button size="sm" variant="danger" onClick={handleRemove}>Remove</Button>
                    {isOwner && (
                        <Button size="sm" variant="primary" onClick={handleRoleSave}>Save</Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Tabs */}
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "general")}>
                <Row>
                    <Col sm={3}>
                        <Nav variant="pills" className="flex-column mb-2">
                            <Nav.Item>
                                <Nav.Link eventKey="general">General</Nav.Link>
                            </Nav.Item>
                            {channel.type == 2 && (
                                <Nav.Item>
                                    <Nav.Link eventKey="members">Members</Nav.Link>
                                </Nav.Item>
                            )}
                        </Nav>
                    </Col>

                    <Col sm={9}>
                        <Tab.Content>
                            {/* Members Tab */}
                            {channel.type == 2 && (
                                <Tab.Pane eventKey="members">
                                    {isAdmin && (
                                        <div className="mb-3">
                                            <Form.Label>Invite by username</Form.Label>
                                            <InputGroup size="sm">
                                                <Form.Control
                                                    value={inviteUsername}
                                                    onChange={(e) => setInviteUsername(e.target.value)}
                                                    placeholder="Username"
                                                />
                                                <Button onClick={handleInvite} variant="primary" disabled={inviteUsername.trim().length < 3}>
                                                    Invite
                                                </Button>
                                            </InputGroup>
                                            {inviteMessage[1] && <Alert className="mt-2" variant={inviteMessage[0]} onClose={() => setInviteMessage(["", ""])} dismissible>{inviteMessage[1]}</Alert>}
                                        </div>
                                    )}

                                    {isAdmin && (
                                        <>
                                            <h5>Invites</h5>
                                            <ListGroup>
                                                {channel.invites?.map((invite) => (
                                                    <ListGroup.Item
                                                        key={invite.id}
                                                        className="d-flex justify-content-between align-items-center"
                                                    >
                                                        <div className="d-flex flex-column">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <ProfileAvatar avatarImage={invite.invitedUserAvatar!} size={36} />
                                                                <ProfileName
                                                                    userId={invite.invitedUserId ?? ""}
                                                                    userName={invite.invitedUserName ?? "Unknown"}
                                                                />
                                                            </div>
                                                            <small className="text-muted ms-5">
                                                                Invited by {invite.authorName}
                                                            </small>
                                                        </div>

                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleCancelInvite(invite.id)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </ListGroup.Item>
                                                ))}
                                                {channel.invites?.length === 0 && (
                                                    <ListGroup.Item className="text-muted fst-italic">No invites</ListGroup.Item>
                                                )}
                                            </ListGroup>
                                        </>
                                    )}

                                    <h5>Members</h5>
                                    <ListGroup>
                                        {channel.participants?.map((x) => (
                                            <ListGroup.Item
                                                key={x.userId}
                                                className="d-flex justify-content-between align-items-center"
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <ProfileAvatar avatarImage={x.userAvatar} size={32} />
                                                    <ProfileName userId={x.userId} userName={x.userName} />
                                                    <Badge bg="secondary">
                                                        {x.role}
                                                    </Badge>
                                                </div>

                                                {isAdmin && x.role != "Owner" && x.userId !== userInfo?.id && (
                                                    <div className="d-flex align-items-center gap-2">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditedParticipantId(x.userId);
                                                                setEditedParticipantRole(x.role);
                                                            }}
                                                        >
                                                            <FaPen />
                                                        </Button>
                                                    </div>
                                                )}
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </Tab.Pane>
                            )}

                            {/* General Tab */}
                            <Tab.Pane eventKey="general">
                                {channel.type == 2 && isOwner && (
                                    <div className="mb-3">
                                        <Form.Label>Channel Name</Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                size="sm"
                                                value={newTitle}
                                                onChange={(e) => setNewTitle(e.target.value)}
                                            />
                                            <Button size="sm" onClick={handleTitleChange} variant="primary" disabled={newTitle.trim().length < 3}>
                                                Save
                                            </Button>
                                        </InputGroup>
                                        {changeTitleMessage[1] && <Alert className="mt-2" variant={changeTitleMessage[0]} onClose={() => setChangeTitleMessage(["", ""])} dismissible>{changeTitleMessage[1]}</Alert>}
                                    </div>
                                )}

                                <div className="mb-3">
                                    <span className="me-3">Notifications</span>
                                    <ToggleSwitch value={notificationsEnabled} onChange={(e) => toggleNotifications((e.target as HTMLInputElement).checked)} />
                                </div>

                                {(channel.type == 1 || isOwner) ? (
                                    <div>
                                        <Button size="sm" variant="danger" onClick={() => setDeleteModalVisible(true)}>
                                            Delete Channel
                                        </Button>
                                    </div>
                                ) : (
                                    <div>
                                        <Button size="sm" variant="outline-danger" onClick={() => setLeaveModalVisible(true)}>
                                            Leave Channel
                                        </Button>
                                    </div>
                                )}
                            </Tab.Pane>
                        </Tab.Content>
                    </Col>
                </Row>
            </Tab.Container>
        </>
    );
};

export default ChannelRoomSettings;
