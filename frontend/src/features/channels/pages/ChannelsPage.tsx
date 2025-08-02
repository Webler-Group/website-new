import { Link } from "react-router-dom";
import ChannelsList2 from "./ChannelsList2";
import { useState } from "react";
import { FaBars } from "react-icons/fa6";
import Channel from "../components/ChannelRoom2";

const ChannelsPage = () => {
    const [channelListVisible, setChannelListVisible] = useState(true);
    const [currentChannelId, setCurrentChannelId] = useState<string | null>("null");

    const openChannelList = () => {
        setChannelListVisible(true);
    }

    const closeChannelList = () => {
        setChannelListVisible(false);
    }

    return (
        <>
            <ChannelsList2 visible={channelListVisible} onHide={closeChannelList} />
            <div className="wb-channels-container">
                <div className="d-flex align-items-center justify-content-between p-2 border-bottom" style={{ height: "60px" }}>
                    <div>
                        <Link to="/">
                            <img src="/resources/images/logo.png" height="44px" width="132px" />
                        </Link>
                    </div>
                    <div>
                        <span className="wb-channels-list__button p-2" onClick={openChannelList}>
                            <FaBars />
                        </span>
                    </div>
                </div>
                {
                    currentChannelId &&
                    <Channel channelId={currentChannelId} />
                }
            </div>
        </>
    )
}

export default ChannelsPage;