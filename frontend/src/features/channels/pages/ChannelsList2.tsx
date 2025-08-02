import { Offcanvas, Button } from "react-bootstrap";
import ChannelListItem, { IChannel } from "../components/ChannelListItem";

interface ChannelsListProps {
    visible: boolean;
    onHide: () => void;
}

// Mock data
const mockChannels: IChannel[] = [
    {
        coverImage: "/resources/images/user1.jpg",
        title: "John Doe",
        lastMessage: {
            senderId: "",
            senderName: "John",
            content: "Hey, are you coming today?",
            date: ""
        },
    },
    {
        coverImage: "/resources/images/group1.jpg",
        title: "Project Team",
        lastMessage: {
            senderId: "",
            senderName: "Alice",
            content: "Don’t forget the 2 PM meeting!",
            date: ""
        },
    },
];

const ChannelsList2 = ({ visible, onHide }: ChannelsListProps) => {
    const handleCreateGroup = () => {
        alert("Create Group Clicked");
        // TODO: Open modal or navigate to group creation page
    };

    return (
        <Offcanvas show={visible} onHide={onHide} placement="end">
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>{mockChannels.length} Channels</Offcanvas.Title>
            </Offcanvas.Header>

            <Offcanvas.Body className="d-flex flex-column" style={{ height: "calc(100% - 62px)" }}>
                <div className="mb-3">
                    <Button variant="primary" onClick={handleCreateGroup} className="w-100">
                        + Create Group
                    </Button>
                </div>

                <div className="flex-grow-1 overflow-auto">
                    {mockChannels.map((channel, index) => (
                        <ChannelListItem key={index} channel={channel} />
                    ))}
                </div>
            </Offcanvas.Body>
        </Offcanvas>
    );
};

export default ChannelsList2;
