import { IChannel } from "./ChannelListItem";
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
    Alert
} from "react-bootstrap";
import { useAuth } from "../../auth/context/authContext";
import ProfileAvatar from "../../../components/ProfileAvatar";
import ProfileName from "../../../components/ProfileName";
import { useApi } from "../../../context/apiCommunication";

interface ChannelRoomSettingsProps {
    channel: IChannel;
}

const ChannelRoomSettings = ({ channel }: ChannelRoomSettingsProps) => {
    const [activeTab, setActiveTab] = useState("members");
    const [inviteUsername, setInviteUsername] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const { userInfo } = useAuth();
    const { sendJsonRequest } = useApi();
    const [inviteMessage, setInviteMessage] = useState(["", ""]);

    useEffect(() => {
        setNewTitle(channel.title ?? "");
    }, [channel]);

    const currentUser = channel.participants?.find(x => x.userId == userInfo?.id);

    const isOwner = currentUser?.role === "Owner";
    const isAdmin = isOwner || currentUser?.role === "Admin";

    const handleInvite = async () => {
        const result = await sendJsonRequest("/Channels/GroupInviteUser", "POST", {
            channelId: channel.id,
            username: inviteUsername.trim()
        });
        if (result && result.invite) {
            setInviteMessage(["success", "Invite created successfully"]);
        } else {
            setInviteMessage(["danger", result.message ?? "Invite failed"])
        }
    };

    const handleKick = (userId: string) => {
        console.log("Kicking user", userId);
    };

    const handleRoleChange = (userId: string, newRole: string) => {
        console.log("Changing role", userId, newRole);
    };

    const handleTitleChange = () => {
        console.log("Changing title to", newTitle);
    };

    const handleLeave = () => {
        console.log("Leaving channel");
    };

    const handleDeleteGroup = () => {
        console.log("Deleting group");
    };

    return (
        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "members")}>
            <Row>
                <Col sm={3}>
                    <Nav variant="pills" className="flex-column">
                        {channel.type == 2 && (
                            <Nav.Item>
                                <Nav.Link eventKey="members">Members</Nav.Link>
                            </Nav.Item>
                        )}
                        <Nav.Item>
                            <Nav.Link eventKey="general">General</Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Col>

                <Col sm={9}>
                    <Tab.Content>
                        {channel.type == 2 && (
                            <Tab.Pane eventKey="members">
                                {isAdmin && (
                                    <Form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleInvite();
                                        }}
                                        className="mb-3"
                                    >
                                        <Form.Label>Invite by username</Form.Label>
                                        <InputGroup size="sm">
                                            <Form.Control
                                                value={inviteUsername}
                                                onChange={(e) => setInviteUsername(e.target.value)}
                                                placeholder="Username"
                                            />
                                            <Button type="submit" variant="primary" disabled={inviteUsername.trim().length < 3}>
                                                Invite
                                            </Button>
                                        </InputGroup>
                                        {inviteMessage[1] && <Alert className="mt-2" variant={inviteMessage[0]} onClose={() => setInviteMessage(["", ""])} dismissible>{inviteMessage[1]}</Alert>}
                                    </Form>
                                )}


                                {isAdmin &&
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
                                                        
                                                    >
                                                        Delete
                                                    </Button>
                                                </ListGroup.Item>
                                            ))}
                                            {channel.invites?.length === 0 && (
                                                <ListGroup.Item className="text-muted fst-italic">No invites</ListGroup.Item>
                                            )}
                                        </ListGroup>
                                    </>
                                }

                                <h5>Members</h5>
                                <ListGroup>
                                    {channel.participants?.map((x) => (
                                        <ListGroup.Item
                                            key={x.userId}
                                            className="d-flex justify-content-between align-items-center"
                                        >
                                            <div className="d-flex align-items-center gap-2">
                                                <ProfileAvatar avatarImage={x.userAvatar} size={42} />
                                                <ProfileName userId={x.userId} userName={x.userName} />
                                                <Badge bg="secondary" className="ms-2">
                                                    {x.role}
                                                </Badge>
                                            </div>

                                            {isAdmin && x.userId !== userInfo?.id && (
                                                <div className="d-flex align-items-center gap-2">
                                                    {isOwner && (
                                                        <Form.Select
                                                            size="sm"
                                                            value={x.role}
                                                            onChange={(e) =>
                                                                handleRoleChange(
                                                                    x.userId,
                                                                    e.target.value
                                                                )
                                                            }
                                                        >
                                                            <option value="member">Member</option>
                                                            <option value="admin">Admin</option>
                                                        </Form.Select>
                                                    )}
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleKick(x.userId)}
                                                    >
                                                        Kick
                                                    </Button>
                                                </div>
                                            )}
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </Tab.Pane>
                        )}

                        <Tab.Pane eventKey="general">
                            <h5>General Settings</h5>

                            {channel.type == 2 && isOwner && (
                                <Form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleTitleChange();
                                    }}
                                    className="mb-3"
                                >
                                    <Form.Label>Channel Name</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                        />
                                        <Button type="submit" variant="success">
                                            Save
                                        </Button>
                                    </InputGroup>
                                </Form>
                            )}

                            {channel.type == 2 && isOwner && (
                                <div className="mb-3">
                                    <Button variant="danger" onClick={handleDeleteGroup}>
                                        Delete Group
                                    </Button>
                                </div>
                            )}

                            <div>
                                <Button variant="outline-danger" onClick={handleLeave}>
                                    Leave Channel
                                </Button>
                            </div>
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
    );
};

export default ChannelRoomSettings;
