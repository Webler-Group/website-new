import { Badge } from "react-bootstrap";
import { FaComment } from "react-icons/fa6";
import { Link } from "react-router-dom";

interface ChannelsButtonProps {
  unseenCount?: number;
}

const ChannelsButton = ({ unseenCount = 0 }: ChannelsButtonProps) => {
  return (
    <Link
      to="/Channels"
      className="btn btn-sm btn-primary position-relative d-flex p-2 align-items-center justify-content-center"
      style={{ marginRight: "0" }}
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

