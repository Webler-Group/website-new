import { useEffect, useState } from "react";
import { Badge } from "react-bootstrap";
import { FaComment } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { useWS } from "../../../context/wsCommunication";

const ChannelsButton = () => {
  const [unseenCount, setUnseenCount] = useState(0);
  const { sendJsonRequest } = useApi();
  const { socket } = useWS();

  useEffect(() => {
    const getUnseenMessagesCount = async () => {
      const result = await sendJsonRequest("/Channels/GetUnseenMessagesCount", "POST", {});
      if (result && result.count !== undefined) {
        setUnseenCount(result.count);
      }
    }
    getUnseenMessagesCount();
  }, []);

  useEffect(() => {
    if (!socket) return;

        const handleNewMessage = async () => {
            setUnseenCount(prev => prev + 1);
        };

        const handleNewInvite = () => {
            setUnseenCount(prev => prev + 1);
        }

        const handleInviteCanceled = () => {
            setUnseenCount(prev => prev - 1);
        }

        socket.on("channels:new_invite", handleNewInvite);
        socket.on("channels:invite_canceled", handleInviteCanceled);
        socket.on("channels:new_message", handleNewMessage);

        return () => {
            socket.off("channels:new_message", handleNewMessage);
            socket.off("channels:new_invite", handleNewInvite);
            socket.off("channels:invite_canceled", handleInviteCanceled);
        };
  }, [socket]);

  return (
    <Link
      to="/Channels"
      className="btn btn-sm btn-primary position-relative d-flex p-2 align-items-center justify-content-center"
    >
      <FaComment className="text-white" />
      {unseenCount > 0 && (
        <Badge
          pill
          bg="danger"
          className="position-absolute top-0 start-100 translate-middle"
        >
          {unseenCount < 100 ? unseenCount.toString() : "99+"}
        </Badge>
      )}
    </Link>
  );
};

export default ChannelsButton;

