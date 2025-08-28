import { useParams, useNavigate } from "react-router-dom";
import ChannelsList2 from "./ChannelsList2";
import ChannelRoom2 from "./ChannelRoom2";
import PageTitle from "../../../layouts/PageTitle";
import { Container, Modal } from "react-bootstrap";

const ChannelsPage = () => {
    const { channelId } = useParams<{ channelId?: string }>();
    const navigate = useNavigate();

    PageTitle("Channels | Webler Codes");

    const onChannelSelect = (id: string) => {
        navigate(`/Channels/${id}`);
    };

    const onExit = () => {
        navigate(`/Channels`);
    };

    return (
        <>
            <Modal
                show={!!channelId}
                onHide={onExit}
                fullscreen
                className="p-0 m-0"
                contentClassName="h-100"
            >
                <Modal.Body className="p-0 m-0 d-flex flex-column">
                    {channelId && <ChannelRoom2 channelId={channelId} onExit={onExit} />}
                </Modal.Body>
            </Modal>
            <Container fluid>
                <div className="wb-channels-container">

                    <ChannelsList2
                        onChannelSelect={onChannelSelect}
                        currentChannelId={channelId ?? null}
                        onExit={onExit}
                    />
                </div>
            </Container>
        </>
    );
};

export default ChannelsPage;
