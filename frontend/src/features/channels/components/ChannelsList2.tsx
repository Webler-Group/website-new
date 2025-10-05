import { Button, Tab, Nav, Modal, FormControl, Alert } from "react-bootstrap";
import ChannelListItem from "./ChannelListItem";
import { useCallback, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import useChannels from "../hooks/useChannels";
import useInvites from "../hooks/useInvites";
import InvitesListItem from "./InvitesListItem";
import Loader from "../../../components/Loader";
import RequestResultAlert from "../../../components/RequestResultAlert";

interface ChannelsListProps {
    onChannelSelect: (channelId: string) => void;
    currentChannelId: string | null;
    onExit: () => void;
}

const ChannelsList2 = ({ onChannelSelect, currentChannelId, onExit }: ChannelsListProps) => {
    const [activeTab, setActiveTab] = useState("channels");
    const [groupTitle, setGroupTitle] = useState("");
    const [createGroupError, setCreateGroupError] = useState<any[] | undefined>();
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
    }, [channels.isLoading, channels.hasNextPage, channels.results]);

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
    }, [invites.isLoading, invites.hasNextPage, invites.results]);

    const handleCreateGroup = async () => {
        const result = await sendJsonRequest("/Channels/CreateGroup", "POST", {
            title: groupTitle
        });
        if (result && result.channel) {
            channels.addChannel(result.channel);
            closeCreateGroupModal();
            setGroupTitle("");
        } else {
            setCreateGroupError(result.error);
        }
    };

    const closeCreateGroupModal = () => {
        setGroupTitle("");
        setCreateGroupError(undefined);
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
            accepted: false
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
                    <FormControl className="my-2" type="text" placeholder="Group title" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} />
                    <RequestResultAlert errors={createGroupError} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeCreateGroupModal}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreateGroup} disabled={groupTitle.length < 3}>Create</Button>
                </Modal.Footer>
            </Modal>
            <div className="d-flex flex-column p-2">

                <div className="mb-3">
                    <Button variant="primary" onClick={() => setCreateGroupModalVisible(true)}>
                        + Create Group
                    </Button>
                </div>

                <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || "channels")}>
                    <Nav variant="pills" className="mb-3 gap-2">
                        <Nav.Item className="position-relative">
                            <Nav.Link className="border border-primary" eventKey="channels">Channels</Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="position-relative">
                            <Nav.Link className="border border-primary" eventKey="invites">Invites</Nav.Link>

                            {invites.totalCount > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                    {invites.totalCount > 99 ? "99+" : invites.totalCount}
                                    <span className="visually-hidden">pending invites</span>
                                </span>
                            )}
                        </Nav.Item>
                    </Nav>

                    <Tab.Content className="flex-grow-1 overflow-auto pb-4">
                        <Tab.Pane eventKey="channels">
                            {!channels.isLoading && channels.error !== "" ? (
                                <Alert variant="danger">{channels.error}</Alert>
                            ) : (!channels.isLoading && channels.results.length === 0) ? (
                                <div className="text-center text-muted mt-5">
                                    You have no channels yet. Create a group or wait for invites!
                                </div>
                            ) : (
                                channelsListContent
                            )}
                            {channels.isLoading && (
                                <div className="d-flex justify-content-center mt-5 text-center">
                                    <Loader />
                                </div>
                            )}
                        </Tab.Pane>

                        <Tab.Pane eventKey="invites">
                            {!invites.isLoading && invites.error !== "" ? (
                                <Alert variant="danger">{invites.error}</Alert>
                            ) : (!invites.isLoading && invites.results.length === 0) ? (
                                <div className="text-center text-muted mt-5">
                                    You have no pending invites.
                                </div>
                            ) : (
                                invitesListContent
                            )}
                            {invites.isLoading && (
                                <div className="d-flex justify-content-center mt-5 text-center">
                                    <Loader />
                                </div>
                            )}
                        </Tab.Pane>
                    </Tab.Content>
                </Tab.Container>
            </div>
        </>
    );
};

export default ChannelsList2;
