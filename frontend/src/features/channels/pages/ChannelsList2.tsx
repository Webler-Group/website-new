import { Offcanvas, Button, Tab, Nav, Modal, FormControl } from "react-bootstrap";
import ChannelListItem from "../components/ChannelListItem";
import { useCallback, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import useChannels from "../hooks/useChannels";
import useInvites from "../hooks/useInvites";
import InvitesListItem from "../components/InvitesListItem";

interface ChannelsListProps {
    visible: boolean;
    onHide: () => void;
    onChannelSelect: (channelId: string) => void;
    currentChannelId: string | null;
    onExit: () => void;
}

const ChannelsList2 = ({ visible, onHide, onChannelSelect, currentChannelId, onExit }: ChannelsListProps) => {
    const [activeTab, setActiveTab] = useState("channels");
    const [groupTitle, setGroupTitle] = useState("");
    const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
    const { sendJsonRequest } = useApi();
    const [channelsFromDate, setChannelsFromDate] = useState<Date | null>(null);
    const onLeaveChannel = useCallback((channelId: string) => {
        if (currentChannelId === channelId) {
            onExit();
        }
    }, [currentChannelId]);
    const channels = useChannels(10, channelsFromDate, onLeaveChannel);
    const [invitesFromDate, setInvitesFromDate] = useState<Date | null>(null);
    const invites = useInvites(10, invitesFromDate);

    const channelsIntObserver = useRef<IntersectionObserver>();
    const lastChannelRef = useCallback((channel: any) => {
        if (channels.isLoading) return;

        if (channelsIntObserver.current) channelsIntObserver.current.disconnect();

        channelsIntObserver.current = new IntersectionObserver(elems => {
            if (elems[0].isIntersecting && channels.hasNextPage) {

                setChannelsFromDate(() => new Date(channels.results[channels.results.length - 1].updatedAt));
            }
        });

        if (channel) channelsIntObserver.current.observe(channel);
    }, [channels.isLoading, channels.hasNextPage]);

    const invitesIntObserver = useRef<IntersectionObserver>();
    const lastInviteRef = useCallback((invite: any) => {
        if (invites.isLoading) return;

        if (invitesIntObserver.current) invitesIntObserver.current.disconnect();

        invitesIntObserver.current = new IntersectionObserver(elems => {
            if (elems[0].isIntersecting && invites.hasNextPage) {

                setInvitesFromDate(() => new Date(invites.results[invites.results.length - 1].createdAt));
            }
        });

        if (invite) invitesIntObserver.current.observe(invite);
    }, [invites.isLoading, invites.hasNextPage]);

    const handleCreateGroup = async () => {
        const result = await sendJsonRequest("/Channels/CreateGroup", "POST", {
            title: groupTitle
        });
        if (result && result.channel) {
            channels.addChannel(result.channel);
        }
        setGroupTitle("");
        closeCreateGroupModal();
    };

    const closeCreateGroupModal = () => {
        setCreateGroupModalVisible(false);
    }

    const onAcceptInvite = async (inviteId: string) => {
        const result = await sendJsonRequest("/Channels/AcceptInvite", "POST", {
            inviteId,
            accepted: true
        });
        if (result && result.success) {
            invites.remove(inviteId);
            setActiveTab("channels");
        }
    }

    const onDeclineInvite = async (inviteId: string) => {
        const result = await sendJsonRequest("/Channels/AcceptInvite", "POST", {
            inviteId,
            accepted: true
        });
        if (result && result.success) {
            invites.remove(inviteId);
        }
    }

    const channelsListContent = channels.results.map((channel, i) => {
        const selected = channel.id === currentChannelId;
        return (
            <div key={channel.id}>
                {channels.results.length === i + 1 ?
                    <ChannelListItem
                        ref={lastChannelRef}
                        channel={channel}
                        onClick={() => onChannelSelect(channel.id)}
                        selected={selected}
                    /> :
                    <ChannelListItem
                        channel={channel}
                        onClick={() => onChannelSelect(channel.id)}
                        selected={selected}
                    />
                }
            </div>
        );
    });

    const invitesListContent = invites.results.map((invite, i) => {
        return (
            <div key={invite.id} className="mt-2">
                {
                    channels.results.length === i + 1 ?
                        <InvitesListItem ref={lastInviteRef} invite={invite} onAccept={onAcceptInvite} onDecline={onDeclineInvite} />
                        :
                        <InvitesListItem invite={invite} onAccept={onAcceptInvite} onDecline={onDeclineInvite} />
                }
            </div>
        );
    });

    return (
        <>
            <Modal show={createGroupModalVisible} onHide={closeCreateGroupModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Create group</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>How would you like to name your group?</p>
                    <FormControl className="mt-2" type="text" placeholder="Group title" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeCreateGroupModal}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreateGroup} disabled={groupTitle.length < 3}>Create</Button>
                </Modal.Footer>
            </Modal>
            <Offcanvas show={visible} onHide={onHide} placement="end">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Channels & Invites</Offcanvas.Title>
                </Offcanvas.Header>

                <Offcanvas.Body className="d-flex flex-column" style={{ height: "calc(100% - 62px)" }}>

                    <div className="mb-3">
                        <Button variant="primary" onClick={() => setCreateGroupModalVisible(true)} className="w-100">
                            + Create Group
                        </Button>
                    </div>

                    <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "channels")}>
                        <Nav variant="pills" className="mb-3">
                            <Nav.Item>
                                <Nav.Link eventKey="channels">Channels</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="invites">Invites</Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <Tab.Content className="flex-grow-1 overflow-auto">
                            <Tab.Pane eventKey="channels">
                                {channelsListContent}
                            </Tab.Pane>

                            <Tab.Pane eventKey="invites">
                                {invitesListContent}
                            </Tab.Pane>

                        </Tab.Content>
                    </Tab.Container>
                </Offcanvas.Body>
            </Offcanvas>
        </>
    );
};

export default ChannelsList2;
