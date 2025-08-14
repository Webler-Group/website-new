import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ChannelsList2 from "./ChannelsList2";
import ChannelRoom2 from "./ChannelRoom2";
import { FaComments } from "react-icons/fa6";

const ChannelsPage = () => {
    const [channelListVisible, setChannelListVisible] = useState(false);
    const { channelId } = useParams<{ channelId?: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        if(!channelId) {
            setChannelListVisible(true);
        }
    }, [channelId]);

    const openChannelList = () => {
        setChannelListVisible(true);
    };

    const closeChannelList = () => {
        setChannelListVisible(false);
    };

    const onChannelSelect = (id: string) => {
        navigate(`/Channels/${id}`);
        setChannelListVisible(false);
    };

    const onExit = () => {
        navigate(`/Channels`);
    };

    return (
        <>
            <ChannelsList2
                visible={channelListVisible}
                onHide={closeChannelList}
                onChannelSelect={onChannelSelect}
                currentChannelId={channelId ?? null}
                onExit={onExit}
            />
            <div className="wb-channels-container">
                <div className="position-relative d-flex align-items-center justify-content-between p-2 border-bottom z-3 bg-white" style={{ height: "44px" }}>
                    <div>
                        <Link to="/">
                            <img src="/resources/images/logo.png" height="32px" width="96px" />
                        </Link>
                    </div>
                    <div>
                        <span className="wb-channels-list__button p-2" onClick={openChannelList}>
                            <FaComments />
                        </span>
                    </div>
                </div>
                {channelId && (
                    <ChannelRoom2 channelId={channelId} onExit={onExit} />
                )}
            </div>
        </>
    );
};

export default ChannelsPage;
